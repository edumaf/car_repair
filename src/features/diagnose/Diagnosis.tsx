// Shared pieces for Diagnose: urgency banner and a list of likely causes (most likely first).
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { Cause } from '@/core/data/knowledgeSchema';
import { getRepairCost } from '@/core/data/seed';
import { sortCauses } from '@/core/diagnose/codes';
import { showRepairCosts } from '@/core/region';
import { AppText } from '@/design/components/AppText';
import { Card } from '@/design/components/Card';
import { usd } from '@/design/components/CostRangeBar';
import { Divider } from '@/design/components/Row';
import { Tag } from '@/design/components/Tag';
import { radius, space, useTheme, type SignalColor } from '@/design/tokens';
import { useRegion } from '@/hooks/useRegion';

type Urgency = 'stop_now' | 'soon' | 'monitor' | 'ok' | 'caution' | 'stop';

const URGENCY: Record<
  Urgency,
  { color: SignalColor; icon: 'warning' | 'time-outline' | 'eye-outline' | 'checkmark-circle-outline'; title: string; text: string }
> = {
  stop_now: {
    color: 'stop',
    icon: 'warning',
    title: 'Stop when it’s safe',
    text: 'Don’t keep driving. Switch off, and have the car checked or towed.',
  },
  stop: {
    color: 'stop',
    icon: 'warning',
    title: 'Don’t drive',
    text: 'Driving could cause more damage or be unsafe. Have it checked or towed.',
  },
  soon: {
    color: 'warn',
    icon: 'time-outline',
    title: 'Get it checked soon',
    text: 'Usually OK for short, gentle trips. Book a mechanic in the next days.',
  },
  caution: {
    color: 'warn',
    icon: 'time-outline',
    title: 'Drive gently, get it checked soon',
    text: 'Short, gentle trips only, and watch for warning lights.',
  },
  monitor: {
    color: 'slate',
    icon: 'eye-outline',
    title: 'Keep an eye on it',
    text: 'Not urgent. Check it when you can and watch if it gets worse.',
  },
  ok: {
    color: 'go',
    icon: 'checkmark-circle-outline',
    title: 'Usually OK to drive',
    text: 'Get it checked when convenient; it can get worse or raise fuel use.',
  },
};

export function UrgencyBanner({ urgency }: { urgency: Urgency }) {
  const t = useTheme();
  const u = URGENCY[urgency];
  const fg = u.color === 'caution' && t.scheme === 'light' ? '#B45309' : t[u.color];
  return (
    <View
      style={[styles.banner, { backgroundColor: t.tint[u.color], borderColor: fg }]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${u.title}. ${u.text}`}>
      <Ionicons name={u.icon} size={26} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" style={{ color: fg }}>
          {u.title}
        </AppText>
        <AppText variant="label">{u.text}</AppText>
      </View>
    </View>
  );
}

const LIKELY: Record<Cause['likelihood'], { label: string; color: SignalColor }> = {
  common: { label: 'Most likely', color: 'brand' },
  possible: { label: 'Possible', color: 'slate' },
  rare: { label: 'Less likely', color: 'slate' },
};

export function CauseList({ causes, title = 'Likely causes' }: { causes: readonly Cause[]; title?: string }) {
  const region = useRegion();
  const costs = showRepairCosts(region);
  return (
    <Card>
      <AppText variant="overline" tone="muted">
        {title}
      </AppText>
      {sortCauses(causes).map((c, i) => {
        const cost = c.repair_cost_id ? getRepairCost(c.repair_cost_id) : undefined;
        return (
          <View key={i} style={{ gap: space.xs }}>
            {i > 0 ? <Divider /> : null}
            <Tag label={LIKELY[c.likelihood].label} color={LIKELY[c.likelihood].color} />
            <AppText variant="bodyStrong">{c.text}</AppText>
            {c.diy_check ? (
              <AppText variant="label" tone="brand">
                Try yourself: {c.diy_check}
              </AppText>
            ) : null}
            {costs && cost ? (
              <AppText variant="caption" tone="muted">
                If it needs fixing: typically {usd(cost.low)}–{usd(cost.high)} in the US.
              </AppText>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

export const DIAGNOSE_DISCLAIMER =
  'Likely causes from general automotive knowledge, not a diagnosis of your car. Only check things you’re comfortable with, with the engine off and cool. Brakes, steering, airbags, fuel leaks and hybrid/EV high-voltage parts are always a job for a mechanic.';

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, alignItems: 'flex-start' },
});
