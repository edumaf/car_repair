// Guided symptom flow: a few questions, then likely causes, urgency and what you can check (CLAUDE.md §20.2).
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getSymptom } from '@/core/data/knowledge';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { ErrorState } from '@/design/components/States';
import { minTouch, radius, space, useTheme } from '@/design/tokens';
import { CauseList, DIAGNOSE_DISCLAIMER, UrgencyBanner } from '@/features/diagnose/Diagnosis';
import { tr } from '@/core/i18n/i18n';

export default function SymptomFlow() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const symptom = getSymptom(id ?? '');
  const [path, setPath] = useState<string[]>(symptom ? [symptom.questions[0].id] : []);
  const [outcomeId, setOutcomeId] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  if (!symptom) return <ErrorState title="Not found" message="Go back and pick a symptom." />;

  const question = symptom.questions.find((q) => q.id === path[path.length - 1]);
  const outcome = outcomeId ? symptom.outcomes.find((o) => o.id === outcomeId) : null;

  const choose = (next?: string, out?: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (out) setOutcomeId(out);
    else if (next) setPath([...path, next]);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const back = () => {
    if (outcomeId) setOutcomeId(null);
    else if (path.length > 1) setPath(path.slice(0, -1));
  };
  const restart = () => {
    setOutcomeId(null);
    setPath([symptom.questions[0].id]);
  };

  return (
    <ScrollView ref={scroll} style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <AppText variant="overline" tone="muted">
        {symptom.category}
      </AppText>
      <AppText variant="title" accessibilityRole="header">
        {symptom.title}
      </AppText>
      {symptom.urgency_hint === 'stop_now' && !outcome ? <UrgencyBanner urgency="stop_now" /> : null}

      {outcome ? (
        <>
          <AppText variant="heading">{outcome.title}</AppText>
          <UrgencyBanner urgency={outcome.urgency} />
          <CauseList causes={outcome.causes} />
          {outcome.see_mechanic_if.length ? (
            <Card>
              <AppText variant="overline" tone="muted">
                See a mechanic if
              </AppText>
              {outcome.see_mechanic_if.map((x, i) => (
                <View key={i} style={styles.bullet}>
                  <Ionicons name="construct-outline" size={16} color={t.warn} style={{ marginTop: 2 }} />
                  <AppText variant="label" style={{ flex: 1 }}>
                    {x}
                  </AppText>
                </View>
              ))}
            </Card>
          ) : null}
          <AppText variant="caption" tone="muted">
            {DIAGNOSE_DISCLAIMER}
          </AppText>
          <Button label="Change my last answer" kind="secondary" icon="arrow-back" onPress={back} />
          <Button label="Start over" kind="ghost" onPress={restart} />
        </>
      ) : question ? (
        <>
          <AppText variant="overline" tone="muted">
            Question {path.length}
          </AppText>
          <AppText variant="heading">{question.text}</AppText>
          {question.options.map((o) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              accessibilityLabel={tr(o.label)}
              onPress={() => choose(o.next, o.outcome)}
              style={({ pressed }) => [styles.option, { backgroundColor: pressed ? t.sunken : t.surface, borderColor: t.border }]}>
              <AppText variant="bodyStrong" style={{ flex: 1 }}>
                {o.label}
              </AppText>
              <Ionicons name="chevron-forward" size={18} color={t.faint} />
            </Pressable>
          ))}
          {path.length > 1 ? <Button label="Back" kind="ghost" icon="arrow-back" onPress={back} /> : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.md, paddingBottom: space.xxxl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouch + 12,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bullet: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
