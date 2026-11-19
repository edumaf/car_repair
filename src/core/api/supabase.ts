// Supabase client with anonymous sign-in (CLAUDE.md §10). The session is kept in expo-secure-store.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { secureStorage } from './secureStorage';
import { ApiError } from './types';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new ApiError('not_configured', 'The backend isn’t set up yet.');
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: secureStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

/** Returns a valid access token, signing in anonymously on first use. */
export async function getAccessToken(forceNew = false): Promise<string> {
  const auth = getSupabase().auth;
  if (!forceNew) {
    const { data } = await auth.getSession();
    if (data.session) return data.session.access_token;
  }
  const { data, error } = await auth.signInAnonymously();
  if (error || !data.session) {
    // e.g. "Anonymous sign-ins are disabled" when the dashboard setting is off.
    const msg = error?.message ?? 'Could not sign in';
    throw new ApiError(/disabled|not allowed|not enabled/i.test(msg) ? 'not_configured' : 'network', msg);
  }
  return data.session.access_token;
}

/** Signs out locally (used by "Delete all my data" after the server account is deleted). */
export async function signOutLocal(): Promise<void> {
  if (!client) return;
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
}
