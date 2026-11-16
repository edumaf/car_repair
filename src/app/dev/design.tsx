import { ScrollView, StyleSheet, View } from 'react-native';

import { FIXTURE_REPORTS } from '@/core/api/mocks/mockClients';
import { getRepairCost } from '@/core/data/seed';
import { VERDICTS } from '@/core/types';
import { complaintGroupLabel } from '@/core/vehicle/labels';
import { REPAIR_COST_DISCLAIMER } from '@/core/verdict/strings';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { CostRangeBar } from '@/design/components/CostRangeBar';
import { ProblemAreaBar } from '@/design/components/ProblemAreaBar';
import { SeverityTag, Tag } from '@/design/components/Tag';
import { VerdictSignal } from '@/design/components/VerdictSignal';
import { VinText } from '@/design/components/VinText';
import { radius, space, useTheme, type SignalColor } from '@/design/tokens';

const SWATCHES: SignalColor[] = ['brand', 'go', 'caution', 'warn', 'stop', 'slate'];

// Dev-only gallery so the owner can review the look on a real phone (light and dark).
export default function DesignPreview() {
  const t = useTheme();
  const altima = FIXTURE_REPORTS.altima_2013;
  const groups = altima.complaints?.groups.slice(0, 5) ?? [];
  const max = groups[0]?.count ?? 0;
  const cvt = getRepairCost('transmission_replacement');

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <AppText variant="hero">Don’t buy a lemon.</AppText>
      <AppText variant="display">Display · Barlow Condensed</AppText>
      <AppText variant="title">Title</AppText>
      <AppText variant="heading">Heading</AppText>
      <AppText>Body text in Inter. Check any used car in 15 minutes.</AppText>
      <AppText variant="caption" tone="muted">
        Caption, muted
      </AppText>

      <View style={styles.swatches}>
        {SWATCHES.map((c) => (
          <View key={c} style={styles.swatch}>
            <View style={[styles.chip, { backgroundColor: t[c] }]} />
            <AppText variant="caption">{c}</AppText>
          </View>
        ))}
      </View>

      <AppText variant="overline" tone="muted">
        Verdict signal
      </AppText>
      {VERDICTS.map((v) => (
        <VerdictSignal key={v} verdict={v} />
      ))}
      <VerdictSignal verdict="WALK_AWAY" possibleScam />

      <AppText variant="overline" tone="muted">
        Tags
      </AppText>
      <View style={styles.wrap}>
        <SeverityTag severity="info" />
        <SeverityTag severity="minor" />
        <SeverityTag severity="major" />
        <SeverityTag severity="critical" />
        <Tag label="Known problem area" color="brand" icon="flag" />
      </View>

      <Card>
        <AppText variant="overline" tone="muted">
          Owner complaints · {altima.decode.year} {altima.decode.make} {altima.decode.model} (real NHTSA data)
        </AppText>
        {groups.map((g) => (
          <ProblemAreaBar key={g.group} label={complaintGroupLabel(g.group)} count={g.count} max={max} />
        ))}
        <AppText variant="caption" tone="muted">
          Complaints are unverified reports from owners; popular models get more complaints.
        </AppText>
      </Card>

      {cvt ? (
        <Card>
          <AppText variant="overline" tone="muted">
            Estimated repair · {cvt.name}
          </AppText>
          <CostRangeBar range={cvt} scaleMax={Math.max(cvt.high * 1.25, 1000)} />
          <AppText variant="caption" tone="muted">
            {REPAIR_COST_DISCLAIMER}
          </AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="overline" tone="muted">
          VIN
        </AppText>
        <VinText vin={altima.decode.vin ?? ''} />
      </Card>

      <Button label="Primary button" icon="scan" onPress={() => {}} />
      <Button label="Secondary button" kind="secondary" onPress={() => {}} />
      <Button label="Ghost button" kind="ghost" onPress={() => {}} />
      <Button label="Loading" loading onPress={() => {}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.md, paddingBottom: space.xxxl },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  swatch: { alignItems: 'center', gap: space.xs },
  chip: { width: 44, height: 44, borderRadius: radius.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
