// PostHog analytics (CLAUDE.md §3, §14): EU cloud, no autocapture, no session replay, anonymous only (we never
// identify a person). Off until EXPO_PUBLIC_POSTHOG_KEY is set; the user can turn it off in Settings.
// In dev builds events are only logged to the console unless EXPO_PUBLIC_ANALYTICS_IN_DEV=1.
import PostHog from 'posthog-react-native';

import type { AnalyticsEvent, AnalyticsEvents } from '@/core/analyticsEvents';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const SEND_IN_DEV = process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV === '1';

let client: PostHog | null = null;
let optedOut = false;

function getClient(): PostHog | null {
  if (!KEY || optedOut || (__DEV__ && !SEND_IN_DEV)) return null;
  client ??= new PostHog(KEY, {
    host: HOST,
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    personProfiles: 'never',
  });
  return client;
}

/** Sends one §14 event. Never throws: analytics must not break the app. */
export function track<E extends AnalyticsEvent>(event: E, props: AnalyticsEvents[E]): void {
  try {
    if (__DEV__ && !SEND_IN_DEV) {
      console.log(`[analytics] ${event}`, props);
      return;
    }
    getClient()?.capture(event, props as Record<string, string | number | boolean | null>);
  } catch {
    // ignore
  }
}

/** Settings → "Share anonymous usage stats". Saved in app_meta by the caller. */
export function setAnalyticsOptOut(out: boolean): void {
  optedOut = out;
  if (out && client) {
    client.optOut().catch(() => {});
    client = null;
  }
}

export const analyticsAvailable = (): boolean => Boolean(KEY);

/** "Delete all my data": forget the anonymous analytics id too. */
export function resetAnalytics(): void {
  try {
    client?.reset();
  } catch {
    // ignore
  }
}
