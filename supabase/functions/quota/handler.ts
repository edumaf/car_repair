// /quota (CLAUDE.md §9, §10): the user's free-tier usage and Premium state, and server-side data deletion.
// POST { action: "status", local_day? }  → 200 QuotaStatus
// POST { action: "delete_data" }         → 200 { deleted: true }  (usage rows + the anonymous account)
import { z } from 'zod';

import { allowAllQuota, resolveDay, type Quota } from '../_shared/quota.ts';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status'), local_day: z.string().max(10).optional() }),
  z.object({ action: z.literal('delete_data') }),
]);

export type QuotaDeps = {
  authenticate: (req: Request) => Promise<string | null>;
  quota?: Quota;
  now?: () => Date;
  log?: (fields: Record<string, unknown>) => void;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function handleQuota(req: Request, deps: QuotaDeps): Promise<Response> {
  const log = (f: Record<string, unknown>) => (deps.log ?? ((x) => console.log(JSON.stringify(x))))({ fn: 'quota', ...f });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const userId = await deps.authenticate(req);
  if (!userId) return json(401, { error: 'unauthorized' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'bad_request' });
  const quota = deps.quota ?? allowAllQuota;

  if (parsed.data.action === 'status') {
    return json(200, await quota.status(userId, resolveDay(parsed.data.local_day, deps.now?.() ?? new Date())));
  }
  try {
    await quota.deleteData(userId);
    log({ action: 'delete_data', ok: true });
    return json(200, { deleted: true });
  } catch (e) {
    log({ action: 'delete_data', error: String(e).slice(0, 200) });
    return json(500, { error: 'delete_failed' });
  }
}
