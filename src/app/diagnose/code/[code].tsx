// One error code: meaning, whether it's OK to drive, likely causes (most likely first), what you can check.
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { lookupCode } from '@/core/diagnose/codes';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { SeverityTag } from '@/design/components/Tag';
import { space, useTheme } from '@/design/tokens';
import { CauseList, DIAGNOSE_DISCLAIMER, UrgencyBanner } from '@/features/diagnose/Diagnosis';

export default function CodeScreen() {
  const t = useTheme();
  const { code } = useLocalSearchParams<{ code: string }>();
  const r = lookupCode(code ?? '');
  const back = <Button label="Describe the symptoms instead" kind="ghost" onPress={() => router.navigate('/diagnose')} />;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      {r.kind === 'known' ? (
        <>
          <View style={{ gap: space.xs }}>
            <AppText variant="mono" tone="brand">
              {r.code.code}
            </AppText>
            <AppText variant="title" accessibilityRole="header">
              {r.code.title}
            </AppText>
            <AppText tone="muted">{r.code.system}</AppText>
            <SeverityTag severity={r.code.severity} />
          </View>
          <UrgencyBanner urgency={r.code.drive} />
          {r.code.notes ? (
            <Card>
              <AppText variant="label">{r.code.notes}</AppText>
            </Card>
          ) : null}
          <CauseList causes={r.code.causes} />
        </>
      ) : r.kind === 'manufacturer' ? (
        <Card>
          <AppText variant="mono" tone="brand">
            {r.code}
          </AppText>
          <AppText variant="title">Manufacturer-specific code</AppText>
          <AppText>
            Codes with a 1 in the second place mean different things for each make. Look it up for your exact car (the owner’s forum or a
            repair manual), or ask a mechanic with a scanner for your brand.
          </AppText>
          <AppText variant="label" tone="muted">
            Area: {r.system}
          </AppText>
        </Card>
      ) : r.kind === 'unknown_generic' ? (
        <Card>
          <AppText variant="mono" tone="brand">
            {r.code}
          </AppText>
          <AppText variant="title">Not in our list yet</AppText>
          <AppText>This is a standard code we don’t cover yet. A mechanic or parts store can tell you what it means.</AppText>
          <AppText variant="label" tone="muted">
            Area: {r.system}
          </AppText>
        </Card>
      ) : (
        <Card>
          <AppText variant="title">That doesn’t look like a code</AppText>
          <AppText>Error codes look like P0301: a letter (P, C, B or U) and four characters.</AppText>
        </Card>
      )}
      <AppText variant="caption" tone="muted">
        {DIAGNOSE_DISCLAIMER}
      </AppText>
      {back}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl } });
