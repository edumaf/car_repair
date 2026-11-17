// "No VIN yet?": pick year → make → model → powertrain (CLAUDE.md §6.2). Lists come from NHTSA via vehicleClient.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { vehicleClient } from '@/core/api/clients';
import type { Powertrain } from '@/core/types';
import { displayMake, displayModel } from '@/core/vehicle/normalize';
import { orderMakes } from '@/core/vehicle/popularMakes';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { ChoiceChips } from '@/design/components/ChoiceChips';
import { ErrorState, LoadingState } from '@/design/components/States';
import { minTouch, radius, space, useTheme } from '@/design/tokens';
import { type } from '@/design/typography';
import { tr } from '@/core/i18n/i18n';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 1 - 1990 + 1 }, (_, i) => THIS_YEAR + 1 - i);

const POWERTRAIN_CHOICES = [
  { value: 'gas', label: 'Gas' },
  { value: 'hybrid', label: 'Hybrid / plug-in' },
  { value: 'ev', label: 'Electric' },
  { value: 'diesel', label: 'Diesel' },
] as const;

type Step = 'year' | 'make' | 'model' | 'powertrain';

function ListRow({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(label)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: t.border, backgroundColor: pressed ? t.sunken : t.surface }]}>
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={t.faint} />
    </Pressable>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const t = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Ionicons name="search" size={18} color={t.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={tr(placeholder)}
        placeholderTextColor={t.faint}
        autoCorrect={false}
        accessibilityLabel={tr(placeholder)}
        style={[type.body, { flex: 1, color: t.ink, paddingVertical: space.sm }]}
      />
    </View>
  );
}

export default function PickYmm() {
  const t = useTheme();
  const [step, setStep] = useState<Step>('year');
  const [year, setYear] = useState<number | null>(null);
  const [make, setMake] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [powertrain, setPowertrain] = useState<Powertrain>('gas');
  const [search, setSearch] = useState('');

  const makes = useQuery({
    queryKey: ['makes', year],
    queryFn: () => vehicleClient.listMakes(year!),
    enabled: step === 'make' && !!year,
    staleTime: 86_400_000,
  });
  const models = useQuery({
    queryKey: ['models', year, make],
    queryFn: () => vehicleClient.listModels(year!, make!),
    enabled: step === 'model' && !!year && !!make,
    staleTime: 86_400_000,
  });

  const s = search.trim().toUpperCase();
  const makeRows = useMemo(() => {
    const all = makes.data ?? [];
    if (s) return all.filter((m) => m.toUpperCase().includes(s));
    const { popular, others } = orderMakes(all);
    return [...popular, ...others];
  }, [makes.data, s]);
  const modelRows = useMemo(() => (models.data ?? []).filter((m) => !s || m.toUpperCase().includes(s)), [models.data, s]);

  const go = (next: Step) => {
    setSearch('');
    setStep(next);
  };
  const crumbs = [year, make && displayMake(make), model && displayModel(model)].filter(Boolean).join(' · ');

  const header = (
    <View style={styles.header}>
      <AppText variant="overline" tone="muted">
        {{ year: 'Step 1 of 4', make: 'Step 2 of 4', model: 'Step 3 of 4', powertrain: 'Step 4 of 4' }[step]}
      </AppText>
      <AppText variant="title">
        {{ year: 'Which year?', make: 'Which make?', model: 'Which model?', powertrain: 'What powers it?' }[step]}
      </AppText>
      {crumbs ? (
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Change your picks')} onPress={() => go('year')}>
          <AppText variant="label" tone="brand">
            {crumbs} · Change
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );

  if (step === 'year') {
    return (
      <FlatList
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        data={YEARS}
        keyExtractor={(y) => String(y)}
        numColumns={3}
        columnWrapperStyle={{ gap: space.sm }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={String(item)}
            onPress={() => {
              setYear(item);
              go('make');
            }}
            style={({ pressed }) => [styles.yearCell, { borderColor: t.border, backgroundColor: pressed ? t.sunken : t.surface }]}>
            <AppText variant="heading">{item}</AppText>
          </Pressable>
        )}
      />
    );
  }

  if (step === 'powertrain') {
    return (
      <View style={[styles.list, { flex: 1, backgroundColor: t.bg }]}>
        {header}
        <ChoiceChips choices={POWERTRAIN_CHOICES} value={powertrain} onChange={setPowertrain} />
        <AppText variant="caption" tone="muted">
          This decides which checks you’ll see (for example, no oil checks on an electric car). Not sure? Choose Gas.
        </AppText>
        <Button
          label="Look it up"
          icon="search"
          onPress={() =>
            router.push({ pathname: '/add/confirm', params: { year: String(year), make: make!, model: model!, powertrain, method: 'ymm' } })
          }
        />
      </View>
    );
  }

  const q = step === 'make' ? makes : models;
  const rows = step === 'make' ? makeRows : modelRows;
  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          {header}
          <SearchBox value={search} onChange={setSearch} placeholder={step === 'make' ? 'Search makes' : 'Search models'} />
        </View>
      }
      data={q.isSuccess ? rows : []}
      keyExtractor={(x) => x}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      ListEmptyComponent={
        q.isPending ? (
          <LoadingState label={step === 'make' ? 'Loading makes from NHTSA…' : 'Loading models from NHTSA…'} />
        ) : q.isError ? (
          <View>
            <ErrorState title="Couldn’t load the list" message={(q.error as Error).message} onRetry={() => q.refetch()} />
            {/* NHTSA's list needs the internet; ours doesn't. */}
            <Button label="Pick make and model instead" kind="ghost" icon="list-outline" onPress={() => router.replace('/add/model')} />
          </View>
        ) : (
          <AppText tone="muted" align="center" style={{ padding: space.xl }}>
            {search ? 'No match. Try a shorter search.' : 'NHTSA has no records for this year.'}
          </AppText>
        )
      }
      renderItem={({ item }) => (
        <ListRow
          label={step === 'make' ? displayMake(item) : displayModel(item)}
          onPress={() => {
            if (step === 'make') {
              setMake(item);
              go('model');
            } else {
              setModel(item);
              go('powertrain');
            }
          }}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.xl, gap: space.sm, paddingBottom: space.xxxl },
  header: { gap: space.xs, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouch + 6,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  yearCell: {
    flex: 1,
    minHeight: minTouch + 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
  },
});
