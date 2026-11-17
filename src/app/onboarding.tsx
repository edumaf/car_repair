// Onboarding (CLAUDE.md §11): welcome, 4 quick questions, camera priming, then the first car (or Diagnose for owners).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { META, setMeta } from '@/db/appMeta';
import { getDb, saveFlag } from '@/db/db';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { RoadScene } from '@/design/components/RoadScene';
import { minTouch, radius, space, useTheme } from '@/design/tokens';
import { tr } from '@/core/i18n/i18n';
import { track } from '@/analytics/analytics';

interface Question {
  id: 'stage' | 'seller' | 'confidence' | 'worry';
  title: string;
  options: { value: string; label: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'stage',
    title: 'Where are you right now?',
    options: [
      { value: 'browsing', label: 'Just browsing' },
      { value: 'found', label: 'Found a car I like' },
      { value: 'today', label: 'Seeing a car today' },
      { value: 'owner', label: 'I own a car with a problem' },
    ],
  },
  {
    id: 'seller',
    title: 'Who’s selling?',
    options: [
      { value: 'private', label: 'Private seller' },
      { value: 'dealer', label: 'Dealer' },
      { value: 'unknown', label: 'Not sure yet' },
    ],
  },
  {
    id: 'confidence',
    title: 'How confident are you with cars?',
    options: [
      { value: 'none', label: 'Not at all' },
      { value: 'little', label: 'A little' },
      { value: 'confident', label: 'Pretty confident' },
    ],
  },
  {
    id: 'worry',
    title: 'What worries you most?',
    options: [
      { value: 'hidden', label: 'Hidden problems' },
      { value: 'overpaying', label: 'Overpaying' },
      { value: 'scams', label: 'Scams' },
      { value: 'paperwork', label: 'Paperwork' },
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
      const next = { ...answers, [q.id]: value };
      setAnswers(next);
      track('onboarding_answer', { question: q.id, answer: value });
      // Owners skip the buying questions and go straight to Diagnose.
      if (q.id === 'stage' && value === 'owner') return finish(next);
      setStep(step + 1);
    };
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.progress}>
            {QUESTIONS.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i < step ? t.brand : t.border }]} />
            ))}
          </View>
          <AppText variant="display" accessibilityRole="header">
            {q.title}
          </AppText>
          {q.options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityLabel={tr(o.label)}
              onPress={() => pick(o.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: pressed || answers[q.id] === o.value ? t.tint.brand : t.surface,
                  borderColor: answers[q.id] === o.value ? t.brand : t.border,
                },
              ]}>
              <AppText variant="bodyStrong">{o.label}</AppText>
            </Pressable>
          ))}
          <Button label="Back" kind="ghost" onPress={() => setStep(step - 1)} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={styles.welcome}>
        <View style={[styles.badge, { backgroundColor: t.tint.brand }]}>
          <Ionicons name="camera" size={40} color={t.brand} />
        </View>
        <AppText variant="display" align="center">
          The camera does the reading
        </AppText>
        <AppText tone="muted" align="center">
          You’ll scan the VIN barcode and photograph tires, rust and the dashboard. Photos stay on your phone; nothing is recorded in the
          background.
        </AppText>
      </View>
      <View style={styles.bottom}>
        <Button
          label="Allow camera"
          icon="camera"
          onPress={async () => {
            await requestCamera().catch(() => null);
            await finish(answers);
          }}
        />
        <Button label="Not now" kind="ghost" onPress={() => finish(answers)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  badge: { width: 96, height: 96, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  bottom: { padding: space.xl, gap: space.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.lg },
  brandDot: { width: 10, height: 10, borderRadius: 5 },
  welcomeText: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  bigHero: { fontSize: 68, lineHeight: 66 },
  content: { padding: space.xl, gap: space.md },
  progress: { flexDirection: 'row', gap: space.xs, marginBottom: space.md },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  option: { minHeight: minTouch + 12, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.lg, justifyContent: 'center' },
});
