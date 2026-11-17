// Verdict & report (CLAUDE.md §6.5, §8): traffic-light verdict + why, estimated repairs, seller questions,
// negotiation script (2 tones). Always shows that this is a self-check, not a professional inspection.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { listingFlagsForCar } from '@/core/listing/fieldFlags';
import { complaintGroupLabel } from '@/core/vehicle/labels';
import { negotiationScript, sellerQuestions, suggestedOffer, type Tone } from '@/core/verdict/negotiation';
import { REPAIR_COST_DISCLAIMER, SELF_CHECK_DISCLAIMER } from '@/core/verdict/strings';
import { computeVerdict } from '@/core/verdict/verdict';
import { confirmedAnswers } from '@/db/answersRepository';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { ChoiceChips } from '@/design/components/ChoiceChips';
import { CostRangeBar, usd } from '@/design/components/CostRangeBar';
import { Divider } from '@/design/components/Row';
import { ErrorState, LoadingState } from '@/design/components/States';
import { Tag } from '@/design/components/Tag';
import { TextField, parseNumber } from '@/design/components/TextField';
import { VerdictSignal } from '@/design/components/VerdictSignal';
import { radius, space, useTheme } from '@/design/tokens';
import { useUpdateCar } from '@/hooks/useCars';
import { useInspection } from '@/hooks/useInspection';
import { usePriceCheck } from '@/hooks/usePriceCheck';
import { useRegion } from '@/hooks/useRegion';
import { showRepairCosts } from '@/core/region';
import { tr } from '@/core/i18n/i18n';

const TONES = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'firm', label: 'Firm' },
] as const;

function Bullet({ children, icon = 'ellipse', color }: { children: string; icon?: 'ellipse' | 'help-circle-outline'; color?: string }) {
  const t = useTheme();
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={icon === 'ellipse' ? 7 : 18} color={color ?? t.muted} style={{ marginTop: icon === 'ellipse' ? 8 : 2 }} />
      <AppText style={{ flex: 1 }}>{children}</AppText>
    </View>
  );
}

export default function VerdictScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const inspection = useInspection(id);
  const update = useUpdateCar(id);
  const [tone, setTone] = useState<Tone>('friendly');
  const [price, setPrice] = useState('');
  const region = useRegion();
  const priceResult = usePriceCheck(id).result;
  const costs = showRepairCosts(region);

  const car = inspection.car.data;
  const answers = useMemo(() => confirmedAnswers(inspection.answers.data ?? {}), [inspection.answers.data]);
  // Same warning signs as the listing card: phrases in the listing text + price far below similar listings, etc.
  const listingMatches = useMemo(() => (car ? listingFlagsForCar(car, priceResult) : []), [car, priceResult]);
  const result = useMemo(() => {
    if (!car) return null;
    return computeVerdict({
      items: inspection.entries.map((e) => e.item),
      answers,
      openRecallCount: car.report?.recalls?.length ?? 0,
      topComplaintGroups: inspection.topGroups,
      listingFlags: listingMatches.map((m) => m.flag),
      pricePosition: priceResult?.position ?? 'unknown',
    });
  }, [car, inspection.entries, inspection.topGroups, answers, listingMatches, priceResult?.position]);

  // Save the verdict with the car (garage badge) and give a success/warning haptic when it changes (§12).
  const signature = result ? `${result.verdict}|${result.possibleScam}` : null;
  useEffect(() => {
    if (!car || !result || inspection.answers.isPending) return;
    const saved = car.verdictJson ? (JSON.parse(car.verdictJson) as { signature?: string }).signature : null;
    if (saved !== signature) {
      update.mutate({
        verdict: result.verdict,
        verdictJson: JSON.stringify({
          coverage: result.coverage,
          repairEstimate: result.repairEstimate,
          problems: result.problemItems.length,
          possibleScam: result.possibleScam,
          signature,
        }),
      });
      if (result.verdict !== 'INCOMPLETE') {
        Haptics.notificationAsync(
          result.verdict === 'LOOKS_GOOD_SO_FAR' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, car?.id, inspection.answers.isPending]);

  if (inspection.car.isPending || inspection.answers.isPending) return <LoadingState label="Working out the verdict…" />;
  if (!car || !result) return <ErrorState title="Car not found" message="It may have been removed." />;

  const questions = sellerQuestions({
    listingFlags: listingMatches.map((m) => m.flag),
    problemItems: result.problemItems,
    recalls: car.report?.recalls ?? [],
  });
  const offer = costs ? suggestedOffer(car.askingPrice, result.repairEstimate, priceResult?.fairRange?.low ?? null) : null;
  const issueNames = result.repairs.map((r) => r.cost.name);
  const script = negotiationScript(tone, {
    issues: issueNames.length ? issueNames : result.problemItems.map((i) => i.title),
    estimate: costs ? result.repairEstimate : null,
    offer,
  });
  const checked = Math.round(result.coverage * inspection.entries.length);
  const showScript = result.problemItems.length > 0 && result.verdict !== 'INCOMPLETE';

  const copy = async (text: string, what: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.selectionAsync().catch(() => {});
    Alert.alert('Copied', `${what} copied. Paste it into a message to the seller.`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VerdictSignal verdict={result.verdict} possibleScam={result.possibleScam} />
        <AppText variant="label" tone="muted">
          Based on {checked} of {inspection.entries.length} checks{car.listingText ? ' and the listing text' : ''}.
        </AppText>

        <Card>
          <AppText variant="overline" tone="muted">
            Why
          </AppText>
          {result.reasons.map((r, i) => (
            <Bullet key={i}>{r}</Bullet>
          ))}
          {result.knownIssueOverlap.length ? (
            <View style={styles.tags}>
              {result.knownIssueOverlap.map((g) => (
                <Tag
                  key={g}
                  label={tr('Known issue for this model: {area}', { area: tr(complaintGroupLabel(g)) })}
                  color="brand"
                  icon="flag"
                />
              ))}
            </View>
          ) : null}
        </Card>

        {result.repairEstimate && costs ? (
          <Card>
            <AppText variant="overline" tone="muted">
              Estimated repairs
            </AppText>
            <CostRangeBar range={result.repairEstimate} scaleMax={Math.max(result.repairEstimate.high * 1.2, 1000)} />
            {result.repairs.map((r) => (
              <View key={r.cost.id} style={styles.repairRow}>
                <AppText style={{ flex: 1 }}>{r.cost.name}</AppText>
                <AppText variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {usd(r.cost.low)}–{usd(r.cost.high)}
                </AppText>
              </View>
            ))}
            <AppText variant="caption" tone="muted">
              {REPAIR_COST_DISCLAIMER}
            </AppText>
          </Card>
        ) : null}

        <Card>
          <View style={styles.cardHead}>
            <AppText variant="overline" tone="muted" style={{ flex: 1 }}>
              Questions to ask the seller
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Copy all questions')}
              onPress={() => copy(questions.join('\n'), 'Questions')}
              hitSlop={8}>
              <Ionicons name="copy-outline" size={20} color={t.brand} />
            </Pressable>
          </View>
          {questions.map((q, i) => (
            <Bullet key={i} icon="help-circle-outline" color={t.brand}>
              {q}
            </Bullet>
          ))}
        </Card>

        {showScript ? (
          <Card>
            <AppText variant="overline" tone="muted">
              Negotiation script
            </AppText>
            <ChoiceChips choices={TONES} value={tone} onChange={setTone} />
            {costs && car.askingPrice == null ? (
              <View style={{ gap: space.sm }}>
                <TextField
                  label="Asking price (for a suggested offer)"
                  prefix="$"
                  keyboardType="number-pad"
                  value={price}
                  onChangeText={setPrice}
                  placeholder="15,900"
                />
                <Button
                  label="Save price"
                  kind="secondary"
                  disabled={parseNumber(price) == null}
                  onPress={() => update.mutate({ askingPrice: parseNumber(price) })}
                />
              </View>
            ) : offer != null ? (
              <AppText variant="label">
                Suggested offer: <AppText variant="bodyStrong">{usd(offer)}</AppText> (asking {usd(car.askingPrice ?? 0)} minus the middle
                of the repair range)
              </AppText>
            ) : null}
            <View style={[styles.script, { backgroundColor: t.sunken }]}>
              <AppText>“{script}”</AppText>
            </View>
            <Button label="Copy the script" icon="copy-outline" kind="secondary" onPress={() => copy(script, 'Script')} />
          </Card>
        ) : null}

        <View style={[styles.disclaimer, { borderColor: t.border }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={t.muted} />
          <AppText variant="label" tone="muted" style={{ flex: 1 }}>
            {SELF_CHECK_DISCLAIMER}
          </AppText>
        </View>

        {result.verdict !== 'INCOMPLETE' ? (
          <Button
            label="Share card"
            icon="share-outline"
            kind="secondary"
            onPress={() => router.push({ pathname: '/car/[id]/share', params: { id } })}
          />
        ) : null}
        <Button
          label={result.verdict === 'INCOMPLETE' ? 'Keep checking' : 'Back to the checklist'}
          icon="clipboard-outline"
          kind="secondary"
          onPress={() => router.back()}
        />
        <Divider />
        <AppText variant="label" tone="muted" align="center">
          Decided?
        </AppText>
        <View style={styles.decide}>
          <View style={{ flex: 1 }}>
            <Button
              label={car.status === 'bought' ? 'Bought ✓' : 'I bought it'}
              kind="ghost"
              onPress={() => update.mutate({ status: car.status === 'bought' ? 'considering' : 'bought' })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={car.status === 'passed' ? 'Passed ✓' : 'I passed'}
              kind="ghost"
              onPress={() => update.mutate({ status: car.status === 'passed' ? 'considering' : 'passed' })}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl },
  bullet: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  repairRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  script: { borderRadius: radius.md, padding: space.lg },
  disclaimer: { flexDirection: 'row', gap: space.sm, borderWidth: 1, borderRadius: radius.md, padding: space.md },
  decide: { flexDirection: 'row', gap: space.sm },
});
