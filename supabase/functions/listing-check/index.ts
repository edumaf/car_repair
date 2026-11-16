// POST /functions/v1/listing-check  (CLAUDE.md §7.3). Secrets: see _shared/runtime.ts and _shared/quotaRuntime.ts.
import { makeQuotaFromEnv } from '../_shared/quotaRuntime.ts';
import { authenticate, makeProvider } from '../_shared/runtime.ts';
import { handleListingCheck } from './handler.ts';

const provider = makeProvider();
const quota = makeQuotaFromEnv((f) => console.log(JSON.stringify({ fn: 'listing-check', ...f })));

Deno.serve((req) => handleListingCheck(req, { provider, authenticate, quota }));
