import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getModel } from '@/core/data/knowledge';
import { formatNumber, money } from '@/core/region';
import { bodyKind } from '@/core/vehicle/bodyKind';
import { checklistProgress } from '@/core/checklist/buildChecklist';
import { answerSummaries } from '@/db/answersRepository';
import { getDb } from '@/db/db';
import { useQuery } from '@tanstack/react-query';
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
import { minTouch, radius, space, useTheme, verdictColor } from '@/design/tokens';
import { carKeys, useCars } from '@/hooks/useCars';
import { usePremium } from '@/hooks/usePremium';
import { plural, tr } from '@/core/i18n/i18n';
import { openCarStep } from '@/features/car/openCar';

type Progress = { checked: number; total: number };

/** The one thing to do next with this car: start, continue, or read the verdict. */
function NextStep({ car, progress, verdict, verdictLabel }: { car: CarRecord; progress: Progress; verdict: Verdict | null; verdictLabel: string | null }) {
  const t = useTheme();
  const decided = verdict && verdict !== 'INCOMPLETE';
  const started = progress.checked > 0;
  const go = () =>
    decided
      ? openCarStep(car.id, 'verdict')
      : started
        ? openCarStep(car.id, 'inspect')
        : router.push({ pathname: '/car/[id]', params: { id: car.id } }); // the report gates the free inspection
  const action = decided ? 'See the verdict' : started ? 'Continue' : 'Start the inspection';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(action)}
      onPress={go}
      style={({ pressed }) => [styles.next, { borderTopColor: t.border, opacity: pressed ? 0.7 : 1 }]}>
      {decided ? (
        <View style={{ flex: 1 }}>
          <Tag label={verdictLabel ?? VERDICT_HEADLINE[verdict]} color={verdictColor[verdict]} />
        </View>
      ) : started ? (
        <View style={styles.progressWrap}>
          <View style={[styles.track, { backgroundColor: t.sunken }]}>
            <View style={[styles.fill, { backgroundColor: t.brand, width: `${Math.round((progress.checked / Math.max(1, progress.total)) * 100)}%` }]} />
          </View>
          <AppText variant="caption" tone="muted">
            {tr('{checked} of {total} checked', progress)}
          </AppText>
        </View>
      ) : (
        <AppText variant="label" tone="muted" style={{ flex: 1 }}>
          Not inspected yet
        </AppText>
      )}
      <View style={styles.nextAction}>
        <AppText variant="label" tone="brand">
          {action}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={t.brand} />
      </View>
    </Pressable>
  );
}

function CarCard({
  car,
  progress,
  selecting,
  selected,
  onSelect,
}: {
  car: CarRecord;
  progress: Progress;
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
    car.mileage != null ? `${formatNumber(car.mileage)} ${car.mileageUnit}` : null,
    recalls != null ? plural(recalls, '{n} recall', '{n} recalls', '{n} de rechemări') : null,
  ].filter(Boolean);
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: selected ? t.brand : t.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={carTitle(car) + (verdictLabel ? tr(', verdict {verdict}', { verdict: tr(verdictLabel) }) : '')}
        accessibilityState={selecting ? { checked: !!selected } : undefined}
        onPress={() => (selecting ? onSelect?.() : router.push({ pathname: '/car/[id]', params: { id: car.id } }))}
        style={({ pressed }) => [styles.cardMain, { opacity: pressed ? 0.85 : 1 }]}>
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
          {car.status !== 'considering' ? (
            <View style={styles.tags}>
              <Tag label={car.status === 'bought' ? 'Bought' : 'Passed'} color="slate" />
            </View>
          ) : null}
        </View>
        {selecting ? (
          <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={24} color={selected ? t.brand : t.faint} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={t.faint} />
        )}
      </Pressable>
      {selecting ? null : <NextStep car={car} progress={progress} verdict={verdict} verdictLabel={verdictLabel} />}
    </View>
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
  const summaries = useQuery({ queryKey: [...carKeys.all, 'progress'], queryFn: () => answerSummaries(getDb()) });
  const progressOf = (c: CarRecord): Progress => checklistProgress(c.powertrain, summaries.data?.[c.id]?.answers ?? {});
  // The inspection you were in the middle of most recently (for the "Continue" button).
  const resume = list
    .filter((c) => (!c.verdict || c.verdict === 'INCOMPLETE') && progressOf(c).checked > 0)
    .sort((a, b) => (summaries.data?.[b.id]?.lastAt ?? 0) - (summaries.data?.[a.id]?.lastAt ?? 0))[0];
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
            {tr('{n} cars · {checked} with a verdict', {
              n: list.length,
              checked: list.filter((c) => c.verdict && c.verdict !== 'INCOMPLETE').length,
            })}
          </AppText>
          <RoadScene hero={bodyKind(list[0].body)} heroWidth={120} height={92} />
          {!selecting && resume ? (
            <>
              <Button
                label={tr('Continue: {car}', { car: carTitle(resume) })}
                kind="road"
                icon="play"
                onPress={() => openCarStep(resume.id, 'inspect')}
              />
              <Button label="Check another car" kind="roadGhost" icon="add" onPress={() => router.navigate('/check')} />
            </>
          ) : !selecting ? (
            <Button label="Check another car" kind="road" icon="add" onPress={() => router.navigate('/check')} />
          ) : null}
        </NightPanel>
        {list.length > 2 ? <ChoiceChips choices={FILTERS} value={filter} onChange={setFilter} /> : null}
        {selecting ? (
          <AppText variant="label" tone="muted">
            Pick 2 or 3 cars to compare ({selected.length}/3).
          </AppText>
        ) : null}
        {shown.map((c) => (
          <CarCard
            key={c.id}
            car={c}
            progress={progressOf(c)}
            selecting={selecting}
            selected={selected.includes(c.id)}
            onSelect={() => toggle(c.id)}
          />
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
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: minTouch + 4,
    paddingHorizontal: space.lg,
    borderTopWidth: 1,
  },
  nextAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  progressWrap: { flex: 1, gap: 4 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  art: { width: 88, height: 64, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', overflow: 'hidden' },
  artLane: { position: 'absolute', left: 10, right: 10, bottom: 7, height: 3, borderRadius: 2 },
  text: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
});
