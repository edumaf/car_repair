// /listing-check request handling (CLAUDE.md §7.3), separated from Deno.serve so it can be unit-tested with fakes.
// POST { mode: "listing", images: [1–3 base64 JPEG] } → 200 { extracted_text, fields }       (Premium)
// POST { mode: "vin_ocr", images: [1 base64 JPEG] }    → 200 { vin: string | null }          (free, daily cap)
//   402 { error: "quota", paywall: true } | 429 { error: "daily_limit" } | 502/504
import {
  cleanVin,
  LISTING_JSON_SCHEMA,
  LISTING_SYSTEM_PROMPT,
  listingRequestSchema,
  parseListingText,
  parseVinText,
  postProcessListing,
  VIN_JSON_SCHEMA,
  VIN_SYSTEM_PROMPT,
} from '../_shared/listingContract.ts';
import { allowAllQuota, resolveDay, type Quota } from '../_shared/quota.ts';
import { VisionError, type VisionProvider, type VisionUsage } from '../_shared/vision.ts';

const MAX_IMAGE_BASE64_CHARS = 4_000_000;

export type ListingDeps = {
  provider: VisionProvider | null;
  authenticate: (req: Request) => Promise<string | null>;
  quota?: Quota;
  now?: () => Date;
  log?: (fields: Record<string, unknown>) => void;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function handleListingCheck(req: Request, deps: ListingDeps): Promise<Response> {
  const started = Date.now();
  const { provider } = deps;
  // Never log images or listing text. Mode, timings, token counts and error codes only.
  const log = (f: Record<string, unknown>) =>
    (deps.log ?? ((x) => console.log(JSON.stringify(x))))({ fn: 'listing-check', provider: provider?.name, model: provider?.model, ...f });

  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!provider) {
    log({ error: 'missing_api_key' });
    return json(500, { error: 'server_not_configured' });
  }
  const userId = await deps.authenticate(req);
  if (!userId) return json(401, { error: 'unauthorized' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const parsed = listingRequestSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'bad_request' });
  const r = parsed.data;
  const images = r.images.map((i) => i.replace(/^data:image\/\w+;base64,/, ''));
  if (images.some((i) => i.length > MAX_IMAGE_BASE64_CHARS || !i.startsWith('/9j/'))) return json(400, { error: 'bad_image' });

  const quota = deps.quota ?? allowAllQuota;
  const day = resolveDay(r.local_day, deps.now?.() ?? new Date());
  const gate = r.mode === 'listing' ? await quota.beginListingCheck(userId, day) : await quota.beginVinRead(userId, day);
  if (!gate.allowed) {
    log({ mode: r.mode, error: gate.reason });
    return gate.reason === 'paywall' ? json(402, { error: 'quota', paywall: true }) : json(429, { error: 'daily_limit' });
  }

  const usage: VisionUsage = { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 };
  const add = (u: VisionUsage) => {
    usage.inputTokens += u.inputTokens;
    usage.outputTokens += u.outputTokens;
    usage.thinkingTokens += u.thinkingTokens;
  };
  const isListing = r.mode === 'listing';
  const base = {
    system: isListing ? LISTING_SYSTEM_PROMPT : VIN_SYSTEM_PROMPT,
    userText: isListing ? `${images.length} screenshot(s) of one listing follow.` : 'One photo follows.',
    imagesBase64Jpeg: images,
    jsonSchema: (isListing ? LISTING_JSON_SCHEMA : VIN_JSON_SCHEMA) as unknown as Record<string, unknown>,
  };
  const parse = (text: string) => (isListing ? parseListingText(text) : parseVinText(text));

  try {
    let attempts = 1;
    let result = await provider.generate(base);
    let out = parse(result.text);
    add(result.usage);
    if (!out.ok) {
      attempts = 2;
      result = await provider.generate({ ...base, retry: { previousText: result.text, errors: out.errors } });
      out = parse(result.text);
      add(result.usage);
    }
    const metrics = {
      mode: r.mode,
      images: images.length,
      attempts,
      latency_ms: Date.now() - started,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      thinking_tokens: usage.thinkingTokens,
      stop_reason: result.stopReason,
    };
    if (!out.ok) {
      await gate.refund();
      log({ ...metrics, error: 'invalid_model_output' });
      return json(502, { error: 'invalid_model_output' });
    }
    const response =
      'extracted_text' in out.value ? postProcessListing(out.value) : { vin: cleanVin((out.value as { vin: string | null }).vin) };
    log({ ...metrics, ok: true });
    return json(200, response);
  } catch (e) {
    await gate.refund();
    const status = e instanceof VisionError ? e.status : 502;
    log({ mode: r.mode, latency_ms: Date.now() - started, error: 'model_call_failed', status, detail: String(e).slice(0, 200) });
    return json(status, { error: status === 504 ? 'model_timeout' : 'model_error' });
  }
}
