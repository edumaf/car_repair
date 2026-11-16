// POSTs JSON to a Supabase Edge Function with the user's token and maps failures to friendly ApiErrors.
import type { z } from 'zod';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { fetchWithTimeout, isRetryable } from './http';
import { getAccessToken } from './supabase';
import { ApiError } from './types';

async function post(name: string, body: unknown, token: string, timeoutMs: number): Promise<Response> {
  return fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
}

/** Maps a function's HTTP response to an ApiError (exported for tests). */
export function errorFor(name: string, status: number, body: { error?: string } | null): ApiError {
  if (status === 402) return new ApiError('quota_exceeded', 'You’ve used your free checks.');
  if (status === 429) return new ApiError('daily_limit', 'You’ve reached today’s limit. Try again tomorrow.');
  // Our functions answer 404 { error: "not_found" }; a 404 without it means the function isn't deployed.
  if (status === 404) {
    return body?.error === 'not_found'
      ? new ApiError('not_found', 'No record found for this car.')
      : new ApiError('not_configured', `The ${name} service isn’t available yet.`);
  }
  if (status === 504) return new ApiError('timeout', 'The check took too long. Try again.');
  if (status >= 500) {
    if (body?.error === 'server_not_configured') return new ApiError('not_configured', 'AI checks aren’t switched on yet.');
    return new ApiError('server', 'Something went wrong on our side. Try again.');
  }
  return new ApiError('invalid_response', `Unexpected answer from the server (${status}).`);
}

async function callOnce<T>(name: string, body: unknown, schema: z.ZodType<T>, timeoutMs: number): Promise<T> {
  let res = await post(name, body, await getAccessToken(), timeoutMs);
  if (res.status === 401) res = await post(name, body, await getAccessToken(true), timeoutMs); // expired/revoked session
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) throw errorFor(name, res.status, json as { error?: string } | null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError('invalid_response', 'Unexpected answer from the server.');
  return parsed.data;
}

/** One automatic retry on timeouts, network and server errors. */
export async function callFunction<T>(name: string, body: unknown, schema: z.ZodType<T>, timeoutMs: number): Promise<T> {
  try {
    return await callOnce(name, body, schema, timeoutMs);
  } catch (e) {
    if (!isRetryable(e)) throw e;
    return callOnce(name, body, schema, timeoutMs);
  }
}

/** The phone's calendar day (YYYY-MM-DD), so daily limits reset at the user's midnight. */
export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
