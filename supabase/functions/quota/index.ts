// POST /functions/v1/quota  (CLAUDE.md §9, §10). Secrets: see _shared/quotaRuntime.ts.
import { makeQuotaFromEnv } from '../_shared/quotaRuntime.ts';
import { authenticate } from '../_shared/runtime.ts';
import { handleQuota } from './handler.ts';

const quota = makeQuotaFromEnv((f) => console.log(JSON.stringify({ fn: 'quota', ...f })));

Deno.serve((req) => handleQuota(req, { authenticate, quota }));
