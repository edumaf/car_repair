// Compare 2-3 cars side by side (CLAUDE.md §6.8): verdict, repairs, recalls, known problem areas, price, mileage.
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getModel } from '@/core/data/knowledge';
import { problemsFor } from '@/core/models/matchModels';
import { priceCheck, type PriceCheckResult } from '@/core/price/priceCheck';
import { money, showRepairCosts } from '@/core/region';
import { VERDICTS, type CostRange, type Verdict } from '@/core/types';
import { complaintGroupLabel } from '@/core/vehicle/labels';
import { topComplaintGroups } from '@/core/vehicle/normalize';
import { POSSIBLE_SCAM_HEADLINE, VERDICT_HEADLINE } from '@/core/verdict/strings';
import { carTitle, getCar, type CarRecord } from '@/db/carsRepository';
import { listComparables } from '@/db/comparablesRepository';
import { getDb } from '@/db/db';
import { AppText } from '@/design/components/AppText';
import { LoadingState } from '@/design/components/States';
import { Tag } from '@/design/components/Tag';
import { hairline, radius, space, useTheme, verdictColor } from '@/design/tokens';
import { useRegion } from '@/hooks/useRegion';
import { tr } from '@/core/i18n/i18n';
import { track } from '@/analytics/analytics';

interface Column {
  car: CarRecord;
  price: PriceCheckResult;
  repairEstimate: CostRange | null;
  possibleScam: boolean;
  problemAreas: string[];
  commonProblems: number;
}

async function loadColumn(id: string): Promise<Column | null> {
  const car = await getCar(getDb(), id);
  if (!car) return null;
  const comps = await listComparables(getDb(), id);
  const saved = car.verdictJson ? (JSON.parse(car.verdictJson) as { repairEstimate?: CostRange | null; possibleScam?: boolean }) : {};
  const model = car.modelId ? getModel(car.modelId) : undefined;
  const modelProblems = model ? problemsFor(model, car.engineId, car.year).relevant : [];
  const areas = [
    ...new Set([
      ...topComplaintGroups(car.report?.complaints ?? null, 3),
      ...modelProblems.map((p) => p.complaint_group).filter((g): g is string => !!g),
    ]),
  ];
  return {
    car,
    price: priceCheck({ askingPrice: car.askingPrice, mileage: car.mileage, year: car.year }, comps),
    repairEstimate: saved.repairEstimate ?? null,
    possibleScam: !!saved.possibleScam,
    problemAreas: areas.slice(0, 3).map(complaintGroupLabel),
    commonProblems: modelProblems.filter((p) => p.frequency === 'common').length,
  };
}

const PRICE_LABEL = { below: 'Below typical', within: 'Typical', above: 'Above typical', unknown: '—' } as const;

export default function CompareScreen() {
  const t = useTheme();
  const region = useRegion();
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const idList = (ids ?? '').split(',').filter(Boolean).slice(0, 3);
  useEffect(() => track('compare_opened', { cars: idList.length }), [idList.length]);
  const q = useQuery({
    queryKey: ['cars', 'compare', ...idList],
    queryFn: async () => (await Promise.all(idList.map(loadColumn))).filter((c): c is Column => !!c),
  });

  if (q.isPending) return <LoadingState label="Comparing…" />;
  const cols = q.data ?? [];

  const rows: { label: string; render: (c: Column) => React.ReactNode }[] = [
    {
      label: 'Verdict',
      render: (c) => {
        const v = VERDICTS.includes(c.car.verdict as Verdict) ? (c.car.verdict as Verdict) : null;
        return v ? (
          <Tag label={v === 'WALK_AWAY' && c.possibleScam ? POSSIBLE_SCAM_HEADLINE : VERDICT_HEADLINE[v]} color={verdictColor[v]} />
        ) : (
          <AppText variant="label" tone="muted">
            Not inspected
          </AppText>
        );
      },
    },
    ...(showRepairCosts(region)
      ? [
          {
            label: 'Likely repairs',
            render: (c: Column) => (
              <AppText variant="label">
                {c.repairEstimate ? `${money(c.repairEstimate.low, 'us')}–${money(c.repairEstimate.high, 'us')}` : '—'}
              </AppText>
            ),
          },
        ]
      : []),
    {
      label: 'Asking price',
      render: (c) => <AppText variant="bodyStrong">{c.car.askingPrice != null ? money(c.car.askingPrice, region) : '—'}</AppText>,
    },
    { label: 'Price vs similar', render: (c) => <AppText variant="label">{PRICE_LABEL[c.price.position]}</AppText> },
    {
      label: 'Mileage',
      render: (c) => (
        <AppText variant="label">{c.car.mileage != null ? `${c.car.mileage.toLocaleString('en-US')} ${c.car.mileageUnit}` : '—'}</AppText>
      ),
    },
    { label: 'Year', render: (c) => <AppText variant="label">{c.car.year ?? '—'}</AppText> },
    { label: 'Engine', render: (c) => <AppText variant="label">{c.car.engineDesc ?? '—'}</AppText> },
    {
      label: 'Recalls',
      render: (c) => <AppText variant="label">{c.car.report?.recalls ? String(c.car.report.recalls.length) : '—'}</AppText>,
    },
    { label: 'Known problem areas', render: (c) => <AppText variant="label">{c.problemAreas.join(', ') || '—'}</AppText> },
    { label: 'Common model problems', render: (c) => <AppText variant="label">{c.car.modelId ? String(c.commonProblems) : '—'}</AppText> },
  ];

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.row}>
            <View style={styles.labelCell} />
            {cols.map((c) => (
              <Pressable
                key={c.car.id}
                accessibilityRole="button"
                accessibilityLabel={tr('Open {car}', { car: carTitle(c.car) })}
                onPress={() => router.push({ pathname: '/car/[id]', params: { id: c.car.id } })}
                style={[styles.cell, styles.headCell, { backgroundColor: t.surface, borderColor: t.border }]}>
                <AppText variant="heading">{carTitle(c.car)}</AppText>
                <AppText variant="caption" tone="brand">
                  Open
                </AppText>
              </Pressable>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.label} style={[styles.row, { borderBottomColor: t.border }]}>
              <View style={styles.labelCell}>
                <AppText variant="overline" tone="muted">
                  {r.label}
                </AppText>
              </View>
              {cols.map((c) => (
                <View key={c.car.id} style={styles.cell}>
                  {r.render(c)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <AppText variant="caption" tone="muted">
        Verdicts come from your own checks. Get a pre-purchase inspection on the car you choose before you pay.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  row: { flexDirection: 'row', borderBottomWidth: hairline, borderBottomColor: 'transparent' },
  labelCell: { width: 110, paddingVertical: space.md, paddingRight: space.sm, justifyContent: 'center' },
  cell: { width: 170, paddingVertical: space.md, paddingHorizontal: space.sm, justifyContent: 'center' },
  headCell: { borderRadius: radius.md, borderWidth: 1, marginHorizontal: space.xs, gap: 2 },
});
