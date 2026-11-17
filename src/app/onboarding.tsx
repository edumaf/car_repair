// Onboarding (CLAUDE.md §11): welcome, 4 quick questions, camera priming, then the first car (or Diagnose for owners).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { META, setMeta } from '@/db/appMeta';
import { getDb, saveFlag } from '@/db/db';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { RoadProgress } from '@/design/components/RoadProgress';
import { RoadScene } from '@/design/components/RoadScene';
import { VinScanDemo } from '@/design/components/VinScanDemo';
import { minTouch, radius, space, useTheme } from '@/design/tokens';
import { tr } from '@/core/i18n/i18n';
import { track } from '@/analytics/analytics';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Question {
  id: 'stage' | 'seller' | 'confidence' | 'worry';
  title: string;
  /** Why we ask, in one line (people answer more honestly when they know). */
  hint: string;
  options: { value: string; label: string; icon: IconName }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'stage',
    title: 'Where are you right now?',
    hint: 'So we show you what matters first.',
    options: [
      { value: 'browsing', label: 'Just browsing', icon: 'search-outline' },
      { value: 'found', label: 'Found a car I like', icon: 'heart-outline' },
      { value: 'today', label: 'Seeing a car today', icon: 'time-outline' },
      { value: 'owner', label: 'I own a car with a problem', icon: 'construct-outline' },
    ],
  },
  {
    id: 'seller',
    title: 'Who’s selling?',
    hint: 'Private sellers and dealers need different questions.',
    options: [
      { value: 'private', label: 'Private seller', icon: 'person-outline' },
      { value: 'dealer', label: 'Dealer', icon: 'business-outline' },
      { value: 'unknown', label: 'Not sure yet', icon: 'help-circle-outline' },
    ],
  },
  {
    id: 'confidence',
    title: 'How confident are you with cars?',
    hint: 'If you’re new to this, we explain every check step by step.',
    options: [
      { value: 'none', label: 'Not at all', icon: 'school-outline' },
      { value: 'little', label: 'A little', icon: 'build-outline' },
      { value: 'confident', label: 'Pretty confident', icon: 'speedometer-outline' },
    ],
  },
  {
    id: 'worry',
    title: 'What worries you most?',
    hint: 'We’ll put that first.',
    options: [
      { value: 'hidden', label: 'Hidden problems', icon: 'eye-outline' },
      { value: 'overpaying', label: 'Overpaying', icon: 'pricetag-outline' },
      { value: 'scams', label: 'Scams', icon: 'shield-outline' },
      { value: 'paperwork', label: 'Paperwork', icon: 'document-text-outline' },
    ],
  },
];

export default function Onboarding() {
  const t = useTheme();
  const [, requestCamera] = useCameraPermissions();
  const [step, setStep] = useState(0); // 0 welcome, 1..4 questions, 5 camera
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const finish = async (final: Record<string, string>) => {
    // Only the options picked (CLAUDE.md §11), never free text.
    track('onboarding_completed', {
      stage: final.stage ?? null,
      seller: final.seller ?? null,
      confidence: final.confidence ?? null,
      worry: final.worry ?? null,
    });
    await setMeta(getDb(), META.onboardingAnswers, JSON.stringify(final));
    await saveFlag('onboardingDone', true);
    router.replace(final.stage === 'owner' ? '/diagnose' : '/check');
  };

  if (step === 0) {
    // Highlight the last word of the headline ("lemon." / "rablă.") in road-paint yellow, in any language.
    const headline = tr('Don’t buy a lemon.');
    const cut = headline.lastIndexOf(' ');
    return (
      <View style={[styles.root, { backgroundColor: t.night }]}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.root}>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: t.lane }]} />
            <AppText variant="overline" tone="onNightMuted">
              Used Car Check
            </AppText>
          </View>
          <View style={styles.welcomeText}>
            <AppText variant="hero" tone="onNight" accessibilityRole="header" style={styles.bigHero}>
              {headline.slice(0, cut + 1)}
              <AppText variant="hero" tone="lane" style={styles.bigHero}>
                {headline.slice(cut + 1)}
              </AppText>
            </AppText>
            <AppText variant="heading" tone="onNightMuted">
              Check any used car in 15 minutes.
            </AppText>
          </View>
          <RoadScene hero="sedan" heroWidth={230} height={170} />
          <View style={styles.bottom}>
            <Button label="Get started" kind="road" icon="arrow-forward" onPress={() => setStep(1)} />
            <AppText variant="caption" tone="onNightMuted" align="center">
              A guided self-check, not a professional inspection or vehicle history report. Not affiliated with NHTSA or any manufacturer.
            </AppText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (step <= QUESTIONS.length) {
    const q = QUESTIONS[step - 1];
    const pick = (value: string) => {
      Haptics.selectionAsync().catch(() => {});
      const next = { ...answers, [q.id]: value };
      setAnswers(next);
      track('onboarding_answer', { question: q.id, answer: value });
      // A beat to see the choice light up, then move on. Owners skip the buying questions and go to Diagnose.
      setTimeout(() => (q.id === 'stage' && value === 'owner' ? finish(next) : setStep(step + 1)), 180);
    };
    return (
      <View style={[styles.root, { backgroundColor: t.night }]}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.root}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr('Back')}
                onPress={() => setStep(step - 1)}
                hitSlop={8}
                style={styles.back}>
                <Ionicons name="chevron-back" size={26} color={t.onNight} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <RoadProgress total={QUESTIONS.length} current={step - 1} />
              </View>
            </View>
            <AppText variant="overline" tone="lane">
              {tr('Question {n} of {total}', { n: step, total: QUESTIONS.length })}
            </AppText>
            <AppText variant="hero" tone="onNight" accessibilityRole="header" style={styles.question}>
              {q.title}
            </AppText>
            <AppText tone="onNightMuted">{q.hint}</AppText>
            <View style={styles.options}>
              {q.options.map((o) => {
                const on = answers[q.id] === o.value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={tr(o.label)}
                    onPress={() => pick(o.value)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: t.nightRaised,
                        borderColor: on || pressed ? t.lane : t.nightRaised,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      },
                    ]}>
                    <View style={[styles.optionIcon, { backgroundColor: on ? t.lane : 'rgba(244,247,251,0.08)' }]}>
                      <Ionicons name={o.icon} size={20} color={on ? t.night : t.lane} />
                    </View>
                    <AppText variant="bodyStrong" tone="onNight" style={{ flex: 1 }}>
                      {o.label}
                    </AppText>
                    <Ionicons name={on ? 'checkmark-circle' : 'chevron-forward'} size={20} color={on ? t.lane : t.onNightMuted} />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.night }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1 }]}>
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => setStep(step - 1)} hitSlop={8} style={styles.back}>
              <Ionicons name="chevron-back" size={26} color={t.onNight} />
            </Pressable>
          </View>
          <AppText variant="overline" tone="lane">
            Last step
          </AppText>
          <AppText variant="hero" tone="onNight" accessibilityRole="header" style={styles.question}>
            The camera does the reading
          </AppText>
          <VinScanDemo />
          <View style={{ gap: space.md }}>
            {CAMERA_POINTS.map((p) => (
              <View key={p.text} style={styles.point}>
                <Ionicons name={p.icon} size={20} color={t.lane} />
                <AppText tone="onNight" style={{ flex: 1 }}>
                  {p.text}
                </AppText>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Button
            label="Allow camera"
            kind="road"
            icon="camera"
            onPress={async () => {
              await requestCamera().catch(() => null);
              await finish(answers);
            }}
          />
          <Button label="Not now" kind="roadGhost" onPress={() => finish(answers)} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const CAMERA_POINTS: { icon: IconName; text: string }[] = [
  { icon: 'barcode-outline', text: 'Scan the VIN barcode instead of typing 17 characters.' },
  { icon: 'camera-outline', text: 'Photograph tires, rust and the dashboard: the AI points out what it sees.' },
  { icon: 'lock-closed-outline', text: 'Photos stay on your phone. Nothing is recorded in the background.' },
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottom: { padding: space.xl, gap: space.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.lg },
  brandDot: { width: 10, height: 10, borderRadius: 5 },
  welcomeText: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  bigHero: { fontSize: 68, lineHeight: 66 },
  content: { padding: space.xl, gap: space.md },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  back: { minWidth: minTouch, minHeight: minTouch, justifyContent: 'center', marginLeft: -space.sm },
  question: { fontSize: 46, lineHeight: 46 },
  options: { gap: space.sm, marginTop: space.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: minTouch + 20,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  optionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
});
