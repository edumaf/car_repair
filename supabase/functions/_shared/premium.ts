// Premium check through RevenueCat's REST API (CLAUDE.md §9, §10). The app's RevenueCat appUserID is the
// Supabase user id, so the server can look the user up by the id in their token.
// Secrets: REVENUECAT_SECRET_KEY (v1 secret key, sk_…), REVENUECAT_ENTITLEMENT (default "premium"),
//          PASS_PRODUCT_ID (default "car_hunt_pass_30d").
//
// The 30-day pass is a NON-RENEWING purchase. RevenueCat reports entitlements unlocked by non-renewing purchases
// with no expiry (like a lifetime unlock), so the pass's end is computed here from its purchase dates: each pass
// adds 30 days, starting when it was bought or when the previous pass ends, whichever is later (no lost days).
import type { PremiumCheck, PremiumInfo } from './quota.ts';

const CACHE_MS = 5 * 60_000;
const TIMEOUT_MS = 4_000;
export const PASS_DAYS = 30;
const DAY_MS = 86_400_000;

type Entitlement = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
};
type Purchase = { purchase_date?: string };
export type Subscriber = {
  entitlements?: Record<string, Entitlement>;
  non_subscriptions?: Record<string, Purchase[]>;
};

/** When the user's stacked passes end (epoch ms), or null if they never bought one. */
export function passExpiresAt(purchases: Purchase[] | undefined): number | null {
  const dates = (purchases ?? [])
    .map((p) => (p.purchase_date ? Date.parse(p.purchase_date) : NaN))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let end: number | null = null;
  for (const d of dates) end = Math.max(end ?? 0, d) + PASS_DAYS * DAY_MS;
  return end;
}

/** Is the entitlement active right now? Pass-backed entitlements end 30 days after purchase (stacked). */
export function premiumFromSubscriber(s: Subscriber | undefined, entitlement: string, passProduct: string, now: number): PremiumInfo {
  const passEnd = passExpiresAt(s?.non_subscriptions?.[passProduct]);
  const e = s?.entitlements?.[entitlement];
  const passActive = passEnd !== null && passEnd > now;
  if (!e) return { active: passActive, passExpiresAt: passEnd };
  if (e.product_identifier === passProduct && !e.expires_date) return { active: passActive, passExpiresAt: passEnd };
  // Subscription (annual): RevenueCat's own expiry. No expiry and not the pass: a lifetime/promotional grant.
  const subActive = !e.expires_date || [e.expires_date, e.grace_period_expires_date].some((d) => !!d && Date.parse(d) > now);
  return { active: subActive || passActive, passExpiresAt: passEnd };
}

export function makeRevenueCatCheck(opts: {
  secretKey: string | undefined;
  entitlement: string;
  passProduct?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  /** Why a check failed (HTTP status or "network"), so a revoked/wrong key shows up in the logs. */
  onError?: (reason: string) => void;
}): PremiumCheck {
  const fetchFn = opts.fetchFn ?? fetch;
  const now = opts.now ?? Date.now;
  const passProduct = opts.passProduct ?? 'car_hunt_pass_30d';
  // Only "premium" answers are cached: a user who has just paid must not wait 5 minutes.
  const cache = new Map<string, { until: number; info: PremiumInfo }>();

  return async (userId) => {
    if (!opts.secretKey) return { active: false, passExpiresAt: null }; // RevenueCat not set up: nobody has paid.
    const hit = cache.get(userId);
    if (hit && hit.until > now()) return hit.info;
    try {
      const res = await fetchFn(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
        headers: { authorization: `Bearer ${opts.secretKey}`, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        opts.onError?.(`http_${res.status}`);
        return null;
      }
      const body = (await res.json()) as { subscriber?: Subscriber };
      const info = premiumFromSubscriber(body.subscriber, opts.entitlement, passProduct, now());
      if (info.active) {
        const passEnd = info.passExpiresAt !== null && info.passExpiresAt > now() ? info.passExpiresAt : Infinity;
        cache.set(userId, { until: Math.min(now() + CACHE_MS, passEnd), info });
      } else cache.delete(userId);
      return info;
    } catch {
      opts.onError?.('network');
      return null;
    }
  };
}
