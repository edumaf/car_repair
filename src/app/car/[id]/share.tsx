// Share card (CLAUDE.md §13): a generic car silhouette (never the user's photo, VIN or plate), the verdict, 3 facts.
// Rendered at 360 pt wide and captured at 1080 px (story 1080×1920 or post 1080×1350).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { showRepairCosts } from '@/core/region';
import { shareFacts } from '@/core/share/shareFacts';
import { VERDICTS, type CostRange, type Verdict } from '@/core/types';
import { complaintGroupLabel } from '@/core/vehicle/labels';
import { confirmedAnswers } from '@/db/answersRepository';
import { carTitle } from '@/db/carsRepository';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { ChoiceChips } from '@/design/components/ChoiceChips';
import { ErrorState, LoadingState } from '@/design/components/States';
import { VerdictSignal } from '@/design/components/VerdictSignal';
import { radius, space, themes } from '@/design/tokens';
import { useInspection } from '@/hooks/useInspection';
import { usePremium } from '@/hooks/usePremium';
import { useRegion } from '@/hooks/useRegion';

const FORMATS = [
  { value: 'story', label: 'Story 9:16' },
  { value: 'post', label: 'Post 4:5' },
] as const;
const W = 360;

export default function ShareCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inspection = useInspection(id);
  const premium = usePremium();
  const region = useRegion();
  const [format, setFormat] = useState<'story' | 'post'>('story');
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const t = themes.light; // the card is always light so it looks the same everywhere

  if (inspection.car.isPending) return <LoadingState label="Preparing…" />;
  const car = inspection.car.data;
  if (!car) return <ErrorState title="Car not found" message="It may have been removed." />;
  const verdict = VERDICTS.includes(car.verdict as Verdict) ? (car.verdict as Verdict) : 'INCOMPLETE';
  const saved = car.verdictJson ? (JSON.parse(car.verdictJson) as { repairEstimate?: CostRange | null; possibleScam?: boolean }) : {};
  const answers = confirmedAnswers(inspection.answers.data ?? {});
  const checked = Object.values(answers).filter((a) => a !== 'skip').length;
  const facts = shareFacts({
    recallsCount: car.report?.recalls ? car.report.recalls.length : null,
    repairEstimate: saved.repairEstimate ?? null,
    showCosts: showRepairCosts(region),
    knownProblemArea: inspection.topGroups[0] ? complaintGroupLabel(inspection.topGroups[0]) : null,
    checked,
    total: inspection.entries.length,
  });
  const H = format === 'story' ? (W * 1920) / 1080 : (W * 1350) / 1080;
  const title = [car.year, car.make, car.model].filter(Boolean).join(' ') || carTitle(car);

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: format === 'story' ? 1920 : 1350,
        result: 'tmpfile',
      });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your check' });
    } catch (e) {
      Alert.alert('Couldn’t share', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ChoiceChips choices={FORMATS} value={format} onChange={setFormat} />
      <View ref={ref} collapsable={false} style={[styles.card, { width: W, height: H, backgroundColor: t.bg }]}>
        <View style={styles.top}>
          <AppText variant="overline" style={{ color: t.muted }}>
            Used car check
          </AppText>
          <AppText variant="display" style={{ color: t.ink }}>
            {title}
          </AppText>
        </View>
        <View style={[styles.silhouette, { backgroundColor: t.tint.brand }]}>
          <Ionicons name="car-sport" size={format === 'story' ? 120 : 84} color={t.brand} />
        </View>
        <VerdictSignal verdict={verdict} possibleScam={!!saved.possibleScam} />
        <View style={{ gap: space.sm }}>
          {facts.map((f) => (
            <View key={f} style={styles.fact}>
              <Ionicons name="checkmark-circle" size={18} color={t.brand} />
              <AppText variant="bodyStrong" style={{ color: t.ink, flex: 1 }}>
                {f}
              </AppText>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          {!premium ? (
            <AppText variant="overline" style={{ color: t.slate }}>
              Free check
            </AppText>
          ) : null}
          <AppText variant="caption" style={{ color: t.muted }} align="center">
            Guided self-check, not a professional inspection.
          </AppText>
          <AppText variant="label" style={{ color: t.brand }} align="center">
            Used Car Check
          </AppText>
        </View>
      </View>
      <Button label="Share" icon="share-outline" loading={busy} onPress={share} />
      <AppText variant="caption" tone="muted" align="center">
        No VIN, plate, price or photos are on the card.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, alignItems: 'center', paddingBottom: space.xxxl },
  card: { borderRadius: radius.lg, padding: space.xl, gap: space.lg, justifyContent: 'space-between', overflow: 'hidden' },
  top: { gap: space.xs },
  silhouette: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, flex: 1, maxHeight: 220 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: { alignItems: 'center', gap: 2 },
});
