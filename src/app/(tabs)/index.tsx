import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { VERDICTS, type Verdict } from '@/core/types';
import { POSSIBLE_SCAM_HEADLINE, VERDICT_HEADLINE } from '@/core/verdict/strings';
import { carTitle, type CarRecord } from '@/db/carsRepository';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { usd } from '@/design/components/CostRangeBar';
import { Screen } from '@/design/components/Screen';
import { Tag } from '@/design/components/Tag';
import { radius, space, useTheme, verdictColor } from '@/design/tokens';
import { useCars } from '@/hooks/useCars';

function CarCard({ car }: { car: CarRecord }) {
  const t = useTheme();
  const recalls = car.report?.recalls?.length;
  const verdict = VERDICTS.includes(car.verdict as Verdict) ? (car.verdict as Verdict) : null;
  const scam = !!car.verdictJson && (JSON.parse(car.verdictJson) as { possibleScam?: boolean }).possibleScam === true;
  const verdictLabel = verdict ? (verdict === 'WALK_AWAY' && scam ? POSSIBLE_SCAM_HEADLINE : VERDICT_HEADLINE[verdict]) : null;
  const facts = [
    car.askingPrice != null ? usd(car.askingPrice) : null,
    car.mileage != null ? `${car.mileage.toLocaleString('en-US')} mi` : null,
    recalls != null ? `${recalls} recall${recalls === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${carTitle(car)}${verdictLabel ? `, verdict ${verdictLabel}` : ''}`}
      onPress={() => router.push({ pathname: '/car/[id]', params: { id: car.id } })}
      style={({ pressed }) => [styles.card, { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: t.tint.brand }]}>
        <Ionicons name="car-sport-outline" size={26} color={t.brand} />
      </View>
      <View style={styles.text}>
        <AppText variant="heading">{carTitle(car)}</AppText>
        {car.trim || car.engineDesc ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {[car.trim, car.engineDesc].filter(Boolean).join(' · ')}
          </AppText>
        ) : null}
        {facts.length ? (
          <AppText variant="label" tone="muted">
            {facts.join(' · ')}
          </AppText>
        ) : null}
        <View style={styles.tags}>
          {verdict ? (
            <Tag label={verdictLabel ?? VERDICT_HEADLINE[verdict]} color={verdictColor[verdict]} />
          ) : (
            <Tag label="Not inspected yet" color="slate" />
          )}
          {car.status !== 'considering' ? <Tag label={car.status === 'bought' ? 'Bought' : 'Passed'} color="slate" /> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.faint} />
    </Pressable>
  );
}

export default function GarageScreen() {
  const t = useTheme();
  const cars = useCars();
  const list = cars.data ?? [];

  if (cars.isSuccess && list.length > 0) {
    return (
      <Screen overline="Your garage" title="Cars you’re checking">
        {list.map((c) => (
          <CarCard key={c.id} car={c} />
        ))}
        <Button label="Check another car" icon="add" kind="secondary" onPress={() => router.navigate('/check')} />
      </Screen>
    );
  }

  return (
    <Screen overline="Your garage" title="Cars you’re checking">
      <Card style={styles.empty}>
        <View style={[styles.badge, { backgroundColor: t.tint.brand }]}>
          <Ionicons name="car-sport-outline" size={34} color={t.brand} />
        </View>
        <AppText variant="hero" align="center">
          Don’t buy a lemon.
        </AppText>
        <AppText tone="muted" align="center">
          Add the car you’re looking at. We’ll pull its recalls and known problem areas, then guide you through a 15-minute check.
        </AppText>
        <View style={styles.cta}>
          <Button label="Check a car" icon="scan" onPress={() => router.navigate('/check')} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: space.xxl, gap: space.md },
  badge: { width: 72, height: 72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cta: { alignSelf: 'stretch', marginTop: space.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1 },
  icon: { width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  text: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
});
