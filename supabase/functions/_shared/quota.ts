// Free-tier limits, enforced on the server (CLAUDE.md §9, §10). Pure TS so it can be unit-tested with fakes;
// the Postgres store and the RevenueCat check are wired in `quotaRuntime.ts`.
//
// Free: 10 AI photo checks in total (the one free inspection), VIN photo reads 10/day, listing screenshots Premium.
// Premium: fair-use ceilings (60 photo checks / day, 30 listing screenshots / day) stop scripts or shared accounts
// from running up AI costs. Vehicle reports are free and unlimited (cached, no AI).
//
// Availability first: if the database or RevenueCat can't be reached, requests are allowed and the problem is
// logged. A paying user must never be blocked by an outage.

export const FREE_PHOTO_CHECKS_TOTAL = 10;
export const PREMIUM_PHOTO_CHECKS_PER_DAY = 60;
export const PREMIUM_LISTING_CHECKS_PER_DAY = 30;
export const VIN_READS_PER_DAY = 10;

export type QuotaStore = {
  consumePhotoCheck(userId: string, day: string, premium: boolean): Promise<boolean>;
  refundPhotoCheck(userId: string, day: string, premium: boolean): Promise<void>;
  consumeDaily(userId: string, day: string, field: 'listing_checks' | 'vin_reads', limit: number | null): Promise<boolean>;
  status(userId: string, day: string): Promise<{ photoChecksToday: number; freePhotoChecks: number; listingChecksToday: number }>;
  /** Deletes every server row for the user and the anonymous account itself. */
  deleteUser(userId: string): Promise<void>;
};

export type PremiumInfo = { active: boolean; /** End of the user's 30-day pass(es), epoch ms. */ passExpiresAt: number | null };
/** The user's Premium state, or null when it couldn't be checked (treated as Premium so payers are never blocked). */
export type PremiumCheck = (userId: string) => Promise<PremiumInfo | null>;

export type Gate = { allowed: false; reason: 'paywall' | 'daily_limit' } | { allowed: true; refund: () => Promise<void> };

export type QuotaStatus = {
  premium: boolean;
  pass_expires_at: number | null;
  day: string;
  free_photo_checks_used: number;
  free_photo_checks_limit: number;
  photo_checks_today: number;
};

export type Quota = {
  beginPhotoCheck(userId: string, day: string): Promise<Gate>;
  beginListingCheck(userId: string, day: string): Promise<Gate>;
  beginVinRead(userId: string, day: string): Promise<Gate>;
  status(userId: string, day: string): Promise<QuotaStatus>;
  deleteData(userId: string): Promise<void>;
};

const noop = () => Promise.resolve();
const allowed = (): Gate => ({ allowed: true, refund: noop });

/** Used when the database isn't configured (and in handler tests): everything allowed, nothing counted. */
export const allowAllQuota: Quota = {
  beginPhotoCheck: () => Promise.resolve(allowed()),
  beginListingCheck: () => Promise.resolve(allowed()),
  beginVinRead: () => Promise.resolve(allowed()),
  status: (_u, day) =>
    Promise.resolve({
      premium: false,
      pass_expires_at: null,
      day,
      free_photo_checks_used: 0,
      free_photo_checks_limit: FREE_PHOTO_CHECKS_TOTAL,
      photo_checks_today: 0,
    }),
  deleteData: noop,
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The app sends its local calendar day; anything more than a day away from the server's UTC date is ignored. */
export function resolveDay(localDay: unknown, now: Date): string {
  const utc = now.toISOString().slice(0, 10);
  if (typeof localDay !== 'string' || !DAY_RE.test(localDay)) return utc;
  const diff = Math.abs(Date.parse(`${localDay}T00:00:00Z`) - Date.parse(`${utc}T00:00:00Z`));
  return Number.isFinite(diff) && diff <= 86_400_000 ? localDay : utc;
}

export function makeQuota(opts: {
  store: QuotaStore;
  isPremium: PremiumCheck;
  testUserIds?: ReadonlySet<string>;
  log: (fields: Record<string, unknown>) => void;
}): Quota {
  const { store, log } = opts;
  const info = async (userId: string): Promise<PremiumInfo & { unknown?: true }> => {
    if (opts.testUserIds?.has(userId)) return { active: true, passExpiresAt: null };
    const p = await opts.isPremium(userId);
    if (p === null) log({ quota: 'premium_check_failed' });
    return p ?? { active: true, passExpiresAt: null, unknown: true };
  };
  const premium = async (userId: string): Promise<boolean> => (await info(userId)).active;
  const failOpen = (op: string, e: unknown): Gate => {
    log({ quota: 'store_failed', op, detail: String(e).slice(0, 200) });
    return allowed();
  };

  return {
    async beginPhotoCheck(userId, day) {
      const isPremium = await premium(userId);
      try {
        const ok = await store.consumePhotoCheck(userId, day, isPremium);
        if (!ok) return { allowed: false, reason: isPremium ? 'daily_limit' : 'paywall' };
        return {
          allowed: true,
          refund: () => store.refundPhotoCheck(userId, day, isPremium).catch((e) => void failOpen('refund_photo', e)),
        };
      } catch (e) {
        return failOpen('consume_photo', e);
      }
    },

    async beginListingCheck(userId, day) {
      if (!(await premium(userId))) return { allowed: false, reason: 'paywall' };
      try {
        const ok = await store.consumeDaily(userId, day, 'listing_checks', PREMIUM_LISTING_CHECKS_PER_DAY);
        return ok ? allowed() : { allowed: false, reason: 'daily_limit' };
      } catch (e) {
        return failOpen('consume_listing', e);
      }
    },

    async beginVinRead(userId, day) {
      const isPremium = await premium(userId);
      try {
        const ok = await store.consumeDaily(userId, day, 'vin_reads', isPremium ? PREMIUM_PHOTO_CHECKS_PER_DAY : VIN_READS_PER_DAY);
        return ok ? allowed() : { allowed: false, reason: 'daily_limit' };
      } catch (e) {
        return failOpen('consume_vin', e);
      }
    },

    async status(userId, day) {
      const p = await info(userId);
      let s = { photoChecksToday: 0, freePhotoChecks: 0, listingChecksToday: 0 };
      try {
        s = await store.status(userId, day);
      } catch (e) {
        failOpen('status', e);
      }
      return {
        // An unknown state is reported as not Premium: the app keeps its own (RevenueCat SDK) view.
        premium: p.active && !p.unknown,
        pass_expires_at: p.passExpiresAt,
        day,
        free_photo_checks_used: s.freePhotoChecks,
        free_photo_checks_limit: FREE_PHOTO_CHECKS_TOTAL,
        photo_checks_today: s.photoChecksToday,
      };
    },

    deleteData: (userId) => store.deleteUser(userId),
  };
}
