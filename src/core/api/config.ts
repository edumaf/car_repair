// Public client config. Only public values live in the app: the Supabase URL and anon key are designed to be
// public (Row Level Security protects data). No other secret ever goes in the app (CLAUDE.md §2.8).
// Set them in .env.local (see .env.example) once the Supabase project exists (Milestone 1).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Mock API clients with fixtures. On by default until the backend is configured: forced with
 * EXPO_PUBLIC_USE_MOCKS=1, or automatic while the Supabase values are blank.
 */
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === '1' || !SUPABASE_URL || !SUPABASE_ANON_KEY;

/** Simulated latency for mocks, so loading states are visible in Expo Go. */
export const MOCK_LATENCY_MS = 900;
