// Deno-only wiring for the free limits: Postgres counters through the service role + RevenueCat.
// Secrets (Supabase → Edge Functions → Secrets):
//   SUPABASE_SERVICE_ROLE_KEY   provided by Supabase automatically
//   REVENUECAT_SECRET_KEY       RevenueCat → Project settings → API keys → secret key (v1). Until set, nobody is Premium.
//   REVENUECAT_ENTITLEMENT      default "premium"
//   PASS_PRODUCT_ID             default "car_hunt_pass_30d" (the non-renewing 30-day pass, see premium.ts)
//   PREMIUM_TEST_USER_IDS       optional, comma-separated Supabase user ids treated as Premium (test phones)
// Tables and functions: supabase/migrations/20261117000000_init.sql.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import { makeRevenueCatCheck } from './premium.ts';
import { allowAllQuota, FREE_PHOTO_CHECKS_TOTAL, makeQuota, PREMIUM_PHOTO_CHECKS_PER_DAY, type Quota, type QuotaStore } from './quota.ts';

export function serviceClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

function supabaseStore(db: SupabaseClient): QuotaStore {
  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw new Error(`${fn}: ${error.code ?? ''} ${error.message}`);
    return data as T;
  };
  return {
    consumePhotoCheck: (userId, day, premium) =>
      rpc<boolean>('consume_photo_check', {
        p_user: userId,
        p_day: day,
        p_premium: premium,
        p_daily_limit: PREMIUM_PHOTO_CHECKS_PER_DAY,
        p_free_limit: FREE_PHOTO_CHECKS_TOTAL,
      }),
    refundPhotoCheck: async (userId, day, premium) => {
      await rpc('refund_photo_check', { p_user: userId, p_day: day, p_premium: premium });
    },
    consumeDaily: (userId, day, field, limit) =>
      rpc<boolean>('consume_daily', { p_user: userId, p_day: day, p_field: field, p_limit: limit }),
    status: async (userId, day) => {
      const rows = await rpc<{ photo_checks_today: number; free_photo_checks: number; listing_checks_today: number }[]>('usage_status', {
        p_user: userId,
        p_day: day,
      });
      const r = rows[0];
      return {
        photoChecksToday: r?.photo_checks_today ?? 0,
        freePhotoChecks: r?.free_photo_checks ?? 0,
        listingChecksToday: r?.listing_checks_today ?? 0,
      };
    },
    deleteUser: async (userId) => {
      await rpc('delete_user_usage', { p_user: userId });
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error && !/not.?found/i.test(error.message)) throw new Error(`delete_user: ${error.message}`);
    },
  };
}

export function makeQuotaFromEnv(log: (fields: Record<string, unknown>) => void): Quota {
  const db = serviceClient();
  if (!db) {
    log({ quota: 'not_configured' });
    return allowAllQuota;
  }
  const env = (k: string) => Deno.env.get(k) || undefined;
  const testUserIds = new Set(
    (env('PREMIUM_TEST_USER_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return makeQuota({
    store: supabaseStore(db),
    isPremium: makeRevenueCatCheck({
      secretKey: env('REVENUECAT_SECRET_KEY'),
      entitlement: env('REVENUECAT_ENTITLEMENT') ?? 'premium',
      passProduct: env('PASS_PRODUCT_ID') ?? 'car_hunt_pass_30d',
      onError: (reason) => log({ quota: 'revenuecat_error', reason }),
    }),
    testUserIds,
    log,
  });
}
