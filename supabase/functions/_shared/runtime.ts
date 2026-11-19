// Deno-only wiring shared by the Edge Functions: vision provider from secrets, and user-token checks.
// Secrets:
//   VISION_PROVIDER  claude (default) | gemini
//   ANTHROPIC_API_KEY, CLAUDE_MODEL (default claude-haiku-5-5), CLAUDE_EFFORT (default low)
//   GEMINI_API_KEY,    GEMINI_MODEL (default gemini-3.8-flash), GEMINI_THINKING_LEVEL (default low)
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

import { createClaudeProvider } from './claude.ts';
import { createGeminiProvider } from './gemini.ts';
import type { VisionProvider } from './vision.ts';

export const MODEL_TIMEOUT_MS = 20_000;

export function makeProvider(): VisionProvider | null {
  const env = (k: string) => Deno.env.get(k) || undefined;
  if ((env('VISION_PROVIDER') ?? 'claude') === 'gemini') {
    const apiKey = env('GEMINI_API_KEY');
    return apiKey
      ? createGeminiProvider({
          apiKey,
          model: env('GEMINI_MODEL') ?? 'gemini-3.8-flash',
          thinkingLevel: env('GEMINI_THINKING_LEVEL') ?? 'low',
          timeoutMs: MODEL_TIMEOUT_MS,
        })
      : null;
  }
  const apiKey = env('ANTHROPIC_API_KEY');
  const effort = env('CLAUDE_EFFORT');
  return apiKey
    ? createClaudeProvider({
        apiKey,
        model: env('CLAUDE_MODEL') ?? 'claude-haiku-5-5',
        effort: effort === 'medium' || effort === 'high' ? effort : 'low',
        timeoutMs: MODEL_TIMEOUT_MS,
      })
    : null;
}

/** Returns the Supabase user id for the request's bearer token, or null. */
export async function authenticate(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  // Any project API key works for verifying a user token; fall back to the key the app sent
  // (publishable keys) if the legacy anon key isn't in the function's environment.
  const apiKey = Deno.env.get('SUPABASE_ANON_KEY') || req.headers.get('apikey');
  if (!apiKey) return null;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}
