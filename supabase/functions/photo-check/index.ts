// POST /functions/v1/photo-check  (CLAUDE.md §7.2). Secrets: see _shared/runtime.ts and _shared/quotaRuntime.ts.
import { makeQuotaFromEnv } from '../_shared/quotaRuntime.ts';
import { authenticate, makeProvider } from '../_shared/runtime.ts';
import { handlePhotoCheck } from './handler.ts';

const provider = makeProvider();
const quota = makeQuotaFromEnv((f) => console.log(JSON.stringify({ fn: 'photo-check', ...f })));

Deno.serve((req) => handlePhotoCheck(req, { provider, authenticate, quota }));
