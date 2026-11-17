import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getModel } from '@/core/data/knowledge';
import { money } from '@/core/region';
import { bodyKind } from '@/core/vehicle/bodyKind';
import { VERDICTS, type CarStatus, type Verdict } from '@/core/types';
import { POSSIBLE_SCAM_HEADLINE, VERDICT_HEADLINE } from '@/core/verdict/strings';
import { carTitle, type CarRecord } from '@/db/carsRepository';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { CarArt } from '@/design/components/CarArt';
import { NightPanel } from '@/design/components/NightPanel';
import { RoadScene } from '@/design/components/RoadScene';
import { ChoiceChips } from '@/design/components/ChoiceChips';
import { Screen } from '@/design/components/Screen';
import { Tag } from '@/design/components/Tag';
import { radius, space, useTheme, verdictColor } from '@/design/tokens';
import { useCars } from '@/hooks/useCars';
import { usePremium } from '@/hooks/usePremium';
import { tr } from '@/core/i18n/i18n';

function CarCard({
  car,
  selecting,
  selected,
  onSelect,
}: {
  car: CarRecord;
  selecting?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const t = useTheme();
  const recalls = car.report?.recalls?.length;
  const verdict = VERDICTS.includes(car.verdict as Verdict) ? (car.verdict as Verdict) : null;
  const scam = !!car.verdictJson && (JSON.parse(car.verdictJson) as { possibleScam?: boolean }).possibleScam === true;
  const verdictLabel = verdict ? (verdict === 'WALK_AWAY' && scam ? POSSIBLE_SCAM_HEADLINE : VERDICT_HEADLINE[verdict]) : null;
  const facts = [
    car.askingPrice != null ? money(car.askingPrice) : null,
    car.mileage != null ? `${car.mileage.toLocaleString('en-US')} ${car.mileageUnit}` : null,
    recalls != null ? `${recalls} recall${recalls === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={carTitle(car) + (verdictLabel ? tr(', verdict {verdict}', { verdict: tr(verdictLabel) }) : '')}
      accessibilityState={selecting ? { checked: !!selected } : undefined}
      onPress={() => (selecting ? onSelect?.() : router.push({ pathname: '/car/[id]', params: { id: car.id } }))}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.surface, borderColor: selected ? t.brand : t.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.art, { backgroundColor: t.night }]}>
        <CarArt kind={bodyKind(car.body, car.modelId ? getModel(car.modelId)?.body[0] : null)} width={70} color={t.onNight} />
        <View style={[styles.artLane, { backgroundColor: verdict ? t[verdictColor[verdict]] : t.lane }]} />
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
      {selecting ? (
        <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={24} color={selected ? t.brand : t.faint} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={t.faint} />
      )}
    </Pressable>
  );
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'considering', label: 'Considering' },
  { value: 'bought', label: 'Bought' },
  { value: 'passed', label: 'Passed' },
] as const;

export default function GarageScreen() {
  const t = useTheme();
  const cars = useCars();
  const list = cars.data ?? [];

  const premium = usePremium();
  const [filter, setFilter] = useState<'all' | CarStatus>('all');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  if (cars.isSuccess && list.length > 0) {
    const shown = filter === 'all' ? list : list.filter((c) => c.status === filter);
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
    return (
      <Screen>
        <NightPanel style={styles.banner}>
          <AppText variant="overline" tone="lane">
            Your garage
          </AppText>
          <AppText variant="display" tone="onNight" accessibilityRole="header">
            Cars you’re checking
          </AppText>
          <AppText variant="label" tone="onNightMuted">
            {tr('{n} cars · {checked} with a verdict', { n: list.length, checked: list.filter((c) => c.verdict).length })}
          </AppText>
          <RoadScene hero={bodyKind(list[0].body)} heroWidth={120} height={92} />
          {!selecting ? <Button label="Check another car" kind="road" icon="add" onPress={() => router.navigate('/check')} /> : null}
        </NightPanel>
        {list.length > 2 ? <ChoiceChips choices={FILTERS} value={filter} onChange={setFilter} /> : null}
        {selecting ? (
          <AppText variant="label" tone="muted">
            Pick 2 or 3 cars to compare ({selected.length}/3).
          </AppText>
        ) : null}
        {shown.map((c) => (
          <CarCard key={c.id} car={c} selecting={selecting} selected={selected.includes(c.id)} onSelect={() => toggle(c.id)} />
        ))}
        {shown.length === 0 ? (
          <AppText tone="muted" align="center">
            No cars here.
          </AppText>
        ) : null}
        {list.length >= 2 ? (
          selecting ? (
            <View style={{ gap: space.sm }}>
              <Button
                label={tr('Compare {n} cars', { n: selected.length })}
                icon="git-compare-outline"
                disabled={selected.length < 2}
                onPress={() => {
                  router.push({ pathname: '/compare', params: { ids: selected.join(',') } });
                  setSelecting(false);
                  setSelected([]);
                }}
              />
              <Button
                label="Cancel"
                kind="ghost"
                onPress={() => {
                  setSelecting(false);
                  setSelected([]);
                }}
              />
            </View>
          ) : (
            <Button
              label={premium ? 'Compare cars' : 'Compare cars (Premium)'}
              icon="git-compare-outline"
              kind="secondary"
              onPress={() =>
                premium ? setSelecting(true) : router.push({ pathname: '/paywall', params: { placement: 'premium_feature' } })
              }
            />
          )
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <NightPanel style={styles.hero}>
        <AppText variant="overline" tone="lane">
          Your garage
        </AppText>
        <AppText variant="hero" tone="onNight" accessibilityRole="header">
          Check your first car
        </AppText>
        <AppText tone="onNightMuted">
          Add the car you’re looking at. We’ll pull its recalls and known problem areas, then guide you through a 15-minute check.
        </AppText>
        <RoadScene hero="hatchback" heroWidth={170} height={128} />
        <Button label="Check a car" kind="road" icon="scan" onPress={() => router.navigate('/check')} />
      </NightPanel>
      <AppText variant="overline" tone="muted">
        How it works
      </AppText>
      {STEPS.map((x, i) => (
        <View key={x.title} style={[styles.step, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.stepNum, { backgroundColor: t.night }]}>
            <AppText variant="heading" tone="lane">
              {String(i + 1)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading">{x.title}</AppText>
            <AppText variant="label" tone="muted">
              {x.text}
            </AppText>
          </View>
          <Ionicons name={x.icon} size={22} color={t.brand} />
        </View>
      ))}
    </Screen>
  );
}

const STEPS = [
  { title: 'Add the car', text: 'Scan the VIN or pick the make and model.', icon: 'barcode-outline' },
  { title: 'Walk around it', text: 'A 15-minute guided check, problem areas first.', icon: 'clipboard-outline' },
  { title: 'Get a clear verdict', text: 'Likely repairs, questions for the seller and an offer.', icon: 'speedometer-outline' },
] as const;

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingBottom: space.xl },
  banner: { gap: space.xs, paddingBottom: space.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1 },
  stepNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1 },
  art: { width: 88, height: 64, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', overflow: 'hidden' },
  artLane: { position: 'absolute', left: 10, right: 10, bottom: 7, height: 3, borderRadius: 2 },
  text: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
});
