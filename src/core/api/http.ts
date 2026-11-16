import { ApiError } from './types';

/** fetch with a hard timeout; network failures and timeouts become ApiError. */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    throw ctrl.signal.aborted
      ? new ApiError('timeout', 'This is taking too long. Check your connection and try again.')
      : new ApiError('network', 'No connection. Check your internet and try again.');
  } finally {
    clearTimeout(timer);
  }
}

export function isRetryable(e: unknown): boolean {
  return e instanceof ApiError && (e.code === 'timeout' || e.code === 'network' || e.code === 'server');
}
