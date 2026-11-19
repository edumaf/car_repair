// /photo-check request handling (CLAUDE.md §7.2), separated from Deno.serve so it can be unit-tested with fakes.
// POST { image: base64 JPEG (1280 px, EXIF-free), photo_type, car: {year, make, model, powertrain}, local_day? }
//   200 PhotoCheckResult | 402 { error: "quota", paywall: true } | 429 { error: "daily_limit" } | 502/504
import {
  buildPhotoUserPrompt,
  parsePhotoText,
  PHOTO_JSON_SCHEMA,
  PHOTO_SYSTEM_PROMPT,
  photoCheckRequestSchema,
  postProcessPhoto,
} from '../_shared/photoContract.ts';
import { allowAllQuota, resolveDay, type Quota } from '../_shared/quota.ts';
import { VisionError, type VisionProvider, type VisionUsage } from '../_shared/vision.ts';

const MAX_IMAGE_BASE64_CHARS = 4_000_000;

export type PhotoDeps = {
  provider: VisionProvider | null;
  authenticate: (req: Request) => Promise<string | null>;
  quota?: Quota;
  now?: () => Date;
  log?: (fields: Record<string, unknown>) => void;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function handlePhotoCheck(req: Request, deps: PhotoDeps): Promise<Response> {
  const started = Date.now();
  const { provider } = deps;
  // Never log images. Photo type, timings, token counts and error codes only.
  const log = (f: Record<string, unknown>) =>
    (deps.log ?? ((x) => console.log(JSON.stringify(x))))({ fn: 'photo-check', provider: provider?.name, model: provider?.model, ...f });

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
  const parsed = photoCheckRequestSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'bad_request' });
  const r = parsed.data;
  const image = r.image.replace(/^data:image\/\w+;base64,/, '');
  if (image.length > MAX_IMAGE_BASE64_CHARS || !image.startsWith('/9j/')) return json(400, { error: 'bad_image' });

  const gate = await (deps.quota ?? allowAllQuota).beginPhotoCheck(userId, resolveDay(r.local_day, deps.now?.() ?? new Date()));
  if (!gate.allowed) {
    log({ photo_type: r.photo_type, error: gate.reason });
    return gate.reason === 'paywall' ? json(402, { error: 'quota', paywall: true }) : json(429, { error: 'daily_limit' });
  }

  const usage: VisionUsage = { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 };
  const add = (u: VisionUsage) => {
    usage.inputTokens += u.inputTokens;
    usage.outputTokens += u.outputTokens;
    usage.thinkingTokens += u.thinkingTokens;
  };
  const base = {
    system: PHOTO_SYSTEM_PROMPT,
    userText: buildPhotoUserPrompt(r),
    imagesBase64Jpeg: [image],
    jsonSchema: PHOTO_JSON_SCHEMA as unknown as Record<string, unknown>,
  };

  try {
    let attempts = 1;
    let result = await provider.generate(base);
    let out = parsePhotoText(result.text);
    add(result.usage);
    if (!out.ok) {
      attempts = 2;
      result = await provider.generate({ ...base, retry: { previousText: result.text, errors: out.errors } });
      out = parsePhotoText(result.text);
      add(result.usage);
    }
    const metrics = {
      photo_type: r.photo_type,
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
    const response = postProcessPhoto(out.value, r.photo_type);
    // An unusable photo doesn't use up a free check.
    if (!response.quality.ok) await gate.refund();
    log({ ...metrics, ok: true, quality_ok: response.quality.ok, findings: response.findings.length, lights: response.lights.length });
    return json(200, response);
  } catch (e) {
    await gate.refund();
    const status = e instanceof VisionError ? e.status : 502;
    log({
      photo_type: r.photo_type,
      latency_ms: Date.now() - started,
      error: 'model_call_failed',
      status,
      detail: String(e).slice(0, 200),
    });
    return json(status, { error: status === 504 ? 'model_timeout' : 'model_error' });
  }
}
