import { assertEquals } from 'jsr:@std/assert@1';

import { makeRevenueCatCheck, passExpiresAt, premiumFromSubscriber } from '../_shared/premium.ts';
import { FREE_PHOTO_CHECKS_TOTAL, makeQuota, type QuotaStore } from '../_shared/quota.ts';
import { handleQuota } from './handler.ts';

const auth = () => Promise.resolve('user-1');
const quiet = () => {};
const post = (body: unknown) => new Request('http://x/quota', { method: 'POST', body: JSON.stringify(body) });
const DAY = 86_400_000;
const NOW = Date.parse('2026-12-10T12:00:00Z');

/** In-memory store with the same rules as the SQL functions. */
function memoryStore(): QuotaStore & { free: number; today: number; deleted: string[] } {
  const s = {
    free: 0,
    today: 0,
    deleted: [] as string[],
    consumePhotoCheck(_u: string, _d: string, premium: boolean) {
      if (premium ? s.today >= 60 : s.free >= FREE_PHOTO_CHECKS_TOTAL) return Promise.resolve(false);
      s.today += 1;
      if (!premium) s.free += 1;
      return Promise.resolve(true);
    },
    refundPhotoCheck(_u: string, _d: string, premium: boolean) {
      s.today -= 1;
      if (!premium) s.free -= 1;
      return Promise.resolve();
    },
    consumeDaily: () => Promise.resolve(true),
    status: () => Promise.resolve({ photoChecksToday: s.today, freePhotoChecks: s.free, listingChecksToday: 0 }),
    deleteUser: (u: string) => (s.deleted.push(u), Promise.resolve()),
  };
  return s;
}

Deno.test('pass expiry: 30 days from purchase, stacked passes add up', () => {
  assertEquals(passExpiresAt(undefined), null);
  const d1 = '2026-12-01T00:00:00Z';
  assertEquals(passExpiresAt([{ purchase_date: d1 }]), Date.parse(d1) + 30 * DAY);
  // Second pass bought on day 20 of the first: ends 30 days after the first one ends.
  const d2 = new Date(Date.parse(d1) + 20 * DAY).toISOString();
  assertEquals(passExpiresAt([{ purchase_date: d2 }, { purchase_date: d1 }]), Date.parse(d1) + 60 * DAY);
});

Deno.test('premium: pass entitlement ends after 30 days; annual uses RevenueCat expiry', () => {
  const pass = 'car_hunt_pass_30d';
  const bought = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
  const passSub = (daysAgo: number) => ({
    entitlements: { premium: { product_identifier: pass, expires_date: null } },
    non_subscriptions: { [pass]: [{ purchase_date: bought(daysAgo) }] },
  });
  assertEquals(premiumFromSubscriber(passSub(10), 'premium', pass, NOW).active, true);
  assertEquals(premiumFromSubscriber(passSub(31), 'premium', pass, NOW).active, false);
  const annual = { entitlements: { premium: { product_identifier: 'pro_annual', expires_date: new Date(NOW + 100 * DAY).toISOString() } } };
  assertEquals(premiumFromSubscriber(annual, 'premium', pass, NOW), { active: true, passExpiresAt: null });
  const lapsed = { entitlements: { premium: { product_identifier: 'pro_annual', expires_date: new Date(NOW - DAY).toISOString() } } };
  assertEquals(premiumFromSubscriber(lapsed, 'premium', pass, NOW).active, false);
  assertEquals(premiumFromSubscriber(undefined, 'premium', pass, NOW).active, false);
});

Deno.test('RevenueCat lookup: no key → not premium; HTTP error → null (fail open)', async () => {
  assertEquals(await makeRevenueCatCheck({ secretKey: undefined, entitlement: 'premium' })('u'), { active: false, passExpiresAt: null });
  const failing = makeRevenueCatCheck({
    secretKey: 'sk',
    entitlement: 'premium',
    fetchFn: () => Promise.resolve(new Response('', { status: 500 })),
  });
  assertEquals(await failing('u'), null);
});

Deno.test('status reports usage and pass expiry; free photo checks run out at 10', async () => {
  const store = memoryStore();
  const quota = makeQuota({ store, isPremium: () => Promise.resolve({ active: false, passExpiresAt: null }), log: quiet });
  for (let i = 0; i < FREE_PHOTO_CHECKS_TOTAL; i++) assertEquals((await quota.beginPhotoCheck('user-1', '2026-12-10')).allowed, true);
  assertEquals(await quota.beginPhotoCheck('user-1', '2026-12-10'), { allowed: false, reason: 'paywall' });
  const res = await handleQuota(post({ action: 'status', local_day: '2026-12-10' }), {
    authenticate: auth,
    quota,
    now: () => new Date(NOW),
    log: quiet,
  });
  assertEquals(await res.json(), {
    premium: false,
    pass_expires_at: null,
    day: '2026-12-10',
    free_photo_checks_used: 10,
    free_photo_checks_limit: 10,
    photo_checks_today: 10,
  });
});

Deno.test('premium check outage: gates stay open but status does not claim Premium', async () => {
  const quota = makeQuota({ store: memoryStore(), isPremium: () => Promise.resolve(null), log: quiet });
  assertEquals((await quota.beginListingCheck('user-1', '2026-12-10')).allowed, true);
  assertEquals((await quota.status('user-1', '2026-12-10')).premium, false);
});

Deno.test('delete_data deletes the user; bad requests rejected', async () => {
  const store = memoryStore();
  const quota = makeQuota({ store, isPremium: () => Promise.resolve(null), log: quiet });
  assertEquals((await handleQuota(post({ action: 'delete_data' }), { authenticate: auth, quota, log: quiet })).status, 200);
  assertEquals(store.deleted, ['user-1']);
  assertEquals((await handleQuota(post({ action: 'nope' }), { authenticate: auth, quota, log: quiet })).status, 400);
  assertEquals(
    (await handleQuota(post({ action: 'status' }), { authenticate: () => Promise.resolve(null), quota, log: quiet })).status,
    401,
  );
});
