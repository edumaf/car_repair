// Small app-wide flags loaded once from app_meta at startup (onboarding done, paywall already shown, premium).
// Kept outside React so the root layout can read them synchronously after initDatabase.
type Flags = { onboardingDone: boolean; firstPaywallShown: boolean; simulatePremium: boolean };

const flags: Flags = { onboardingDone: false, firstPaywallShown: false, simulatePremium: false };
const listeners = new Set<(f: Flags) => void>();

export const getFlags = (): Readonly<Flags> => flags;
export function setFlags(patch: Partial<Flags>): void {
  Object.assign(flags, patch);
  listeners.forEach((l) => l({ ...flags }));
}
export function onFlagsChange(l: (f: Flags) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
