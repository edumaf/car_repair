// Which API clients the app uses:
// - "mock":   offline sample data (fixtures), for tests and working without a network.
// - "direct": DEV BUILDS ONLY. The phone calls NHTSA itself (free, keyless) so real VINs can be tested before the
//             backend exists. AI features (photo/listing checks) return sample results in this mode.
// - "live":   everything through our Supabase backend (CLAUDE.md §2.8). The only mode a release build can use
//             once the backend is configured.
import { BACKEND_CONFIGURED } from './config';

export type ApiMode = 'mock' | 'direct' | 'live';

declare const __DEV__: boolean | undefined;
const isDev = () => typeof __DEV__ !== 'undefined' && __DEV__ === true;

function initialMode(): ApiMode {
  const forced = process.env.EXPO_PUBLIC_API_MODE;
  if (forced === 'mock' || forced === 'live') return forced;
  if (forced === 'direct' && isDev()) return 'direct';
  if (BACKEND_CONFIGURED) return 'live';
  return isDev() ? 'direct' : 'mock';
}

let mode: ApiMode = initialMode();
const listeners = new Set<(m: ApiMode) => void>();

export const getApiMode = (): ApiMode => mode;

/** Modes the user can pick in the dev settings. */
export function availableModes(): ApiMode[] {
  return [...(isDev() ? (['mock', 'direct'] as ApiMode[]) : ['mock' as ApiMode]), ...(BACKEND_CONFIGURED ? (['live'] as ApiMode[]) : [])];
}

export function setApiMode(next: ApiMode): void {
  if (!availableModes().includes(next) || next === mode) return;
  mode = next;
  listeners.forEach((l) => l(mode));
}

export function onApiModeChange(listener: (m: ApiMode) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True when AI results are canned samples (anything but the live backend). */
export const aiIsSample = (): boolean => mode !== 'live';
