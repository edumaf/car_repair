// Pick a car from our model database: make → model generation → engine → year (CLAUDE.md §20.2). Works for any
// country. With a VIN, we pre-fill what the VIN tells us (make, VW-group model code, year). With carId, it attaches
// a model/engine to an existing car instead of creating one.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { CarModel, Engine } from '@/core/data/knowledgeSchema';
import { manualReport } from '@/core/models/manualReport';
import { findModelsByVin, listMakes, modelsForMake } from '@/core/models/matchModels';
import type { Powertrain } from '@/core/types';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { CarHeader } from '@/design/components/CarHeader';
import { ChoiceChips } from '@/design/components/ChoiceChips';
import { TextField } from '@/design/components/TextField';
import { minTouch, radius, space, useTheme } from '@/design/tokens';
import { type } from '@/design/typography';
import { CarDetailsForm, EMPTY_DETAILS, useDetailsValues } from '@/features/add/CarDetailsForm';
import { useCar, useCreateCar, useUpdateCar } from '@/hooks/useCars';
import { tr } from '@/core/i18n/i18n';
import { bodyKind } from '@/core/vehicle/bodyKind';

type Step = 'make' | 'model' | 'engine' | 'year' | 'save' | 'manual';

const FUELS = [
  { value: 'gas', label: 'Petrol / gas' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'ev', label: 'Electric' },
] as const;

function Row({ title, subtitle, onPress, highlight }: { title: string; subtitle?: string; onPress: () => void; highlight?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle]
        .filter((x): x is string => !!x)
        .map((x) => tr(x))
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: highlight ? t.brand : t.border, backgroundColor: pressed ? t.sunken : t.surface },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.faint} />
    </Pressable>
  );
}

const yearsLabel = (m: CarModel) => `${m.years[0]}–${m.years[1] >= new Date().getFullYear() ? 'now' : m.years[1]}`;

export default function PickModel() {
  const t = useTheme();
  const p = useLocalSearchParams<{ vin?: string; carId?: string }>();
  const attachCar = useCar(p.carId);
  const attaching = !!p.carId;
  const vinMatch = useMemo(() => (p.vin ? findModelsByVin(p.vin) : null), [p.vin]);

  const only = vinMatch && vinMatch.candidates.length === 1 ? vinMatch.candidates[0] : null;
  const [step, setStep] = useState<Step>(only ? 'engine' : vinMatch?.make ? 'model' : 'make');
  const [make, setMake] = useState<string | null>(only?.make ?? vinMatch?.make ?? null);
  const [model, setModel] = useState<CarModel | null>(only);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const values = useDetailsValues(details);
  const [manual, setManual] = useState({ make: '', model: '', year: '', fuel: 'gas' as Powertrain });
  const create = useCreateCar();
  const update = useUpdateCar(p.carId ?? '');

  const vinCandidates = new Set(vinMatch?.candidates.map((m) => m.id) ?? []);
  const s = search.trim().toLowerCase();

  const openCar = (id: string) => {
    if (router.canDismiss()) router.dismissAll();
    router.push({ pathname: '/car/[id]', params: { id } });
  };

  const pickYear = (m: CarModel, e: Engine | null) => {
    if (attaching) {
      update.mutate({ modelId: m.id, engineId: e?.id ?? null, ...(e ? { powertrain: e.fuel } : {}) }, { onSuccess: () => router.back() });
      return;
    }
    const vinYear = vinMatch?.year;
    if (vinYear && vinYear >= m.years[0] && vinYear <= m.years[1]) {
      setYear(vinYear);
      setStep('save');
    } else setStep('year');
  };

  const save = async () => {
    if (!model) return;
    const report = manualReport({ model, engine, year, vin: p.vin ?? null });
    const id = await create.mutateAsync({ report, modelId: model.id, engineId: engine?.id ?? null, ...values });
    openCar(id);
  };

  const saveManual = async () => {
    const report = manualReport({
      make: manual.make.trim(),
      modelName: manual.model.trim(),
      year: Number(manual.year) || null,
      powertrain: manual.fuel,
      vin: p.vin ?? null,
    });
    const id = await create.mutateAsync({ report, ...values });
    openCar(id);
  };

  const header = (title: string, overline?: string) => (
    <View style={styles.header}>
      {overline ? (
        <AppText variant="overline" tone="muted">
          {overline}
        </AppText>
      ) : null}
      <AppText variant="title">{title}</AppText>
      {p.vin && step !== 'manual' ? (
        <AppText variant="caption" tone="muted">
          {vinMatch?.make
            ? vinMatch.year
              ? tr('From the VIN: {make}, probably {year}. Please confirm.', { make: vinMatch.make, year: vinMatch.year })
              : tr('From the VIN: {make}. Please confirm.', { make: vinMatch.make })
            : 'We couldn’t read the make from this VIN. Pick it below.'}
        </AppText>
      ) : null}
    </View>
  );

  const searchBox = (placeholder: string) => (
    <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Ionicons name="search" size={18} color={t.muted} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={tr(placeholder)}
        placeholderTextColor={t.faint}
        autoCorrect={false}
        accessibilityLabel={tr(placeholder)}
        style={[type.body, { flex: 1, color: t.ink, paddingVertical: space.sm }]}
      />
    </View>
  );

  const notListed = (
    <Button
      label="My car isn’t listed"
      kind="ghost"
      onPress={() => {
        setManual((m) => ({ ...m, make: make ?? m.make }));
        setStep('manual');
      }}
    />
  );

  if (step === 'make') {
    const makes = listMakes().filter((m) => !s || m.toLowerCase().includes(s));
    return (
      <FlatList
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            {header('Which make?', attaching ? 'Choose the model' : 'Add a car')}
            {searchBox('Search makes')}
          </View>
        }
        data={makes}
        keyExtractor={(x) => x}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        renderItem={({ item }) => (
          <Row
            title={item}
            onPress={() => {
              setMake(item);
              setSearch('');
              setStep('model');
            }}
          />
        )}
        ListFooterComponent={attaching ? undefined : notListed}
      />
    );
  }

  if (step === 'model' && make) {
    const models = modelsForMake(make)
      .filter((m) => !s || `${m.model} ${m.generation}`.toLowerCase().includes(s))
      .sort((a, b) => Number(vinCandidates.has(b.id)) - Number(vinCandidates.has(a.id)));
    return (
      <FlatList
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            {header('Which model?', make)}
            {searchBox('Search models')}
          </View>
        }
        data={models}
        keyExtractor={(m) => m.id}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        renderItem={({ item }) => (
          <Row
            title={item.model}
            subtitle={`${item.generation} · ${yearsLabel(item)}${vinCandidates.has(item.id) ? ` · ${tr('fits your VIN')}` : ''}`}
            highlight={vinCandidates.has(item.id)}
            onPress={() => {
              setModel(item);
              setSearch('');
              setStep('engine');
            }}
          />
        )}
        ListFooterComponent={
          <View>
            <Button
              label="Change the make"
              kind="ghost"
              onPress={() => {
                setSearch('');
                setStep('make');
              }}
            />
            {attaching ? null : notListed}
          </View>
        }
      />
    );
  }

  if (step === 'engine' && model) {
    // The VIN pointed to exactly this model, so we skipped the model list: say so clearly, with a way out.
    const fromVin = !!only && only.id === model.id;
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.list}>
        {fromVin ? (
          <View style={[styles.vinPick, { borderColor: t.brand, backgroundColor: t.tint.brand }]}>
            <AppText variant="overline" tone="brand">
              From your VIN
            </AppText>
            <AppText variant="title">{`${model.make} ${model.model} ${model.generation}`}</AppText>
            <AppText variant="label" tone="muted">
              {vinMatch?.year ? tr('Built {years} · probably {year}', { years: yearsLabel(model), year: vinMatch.year }) : yearsLabel(model)}
            </AppText>
            <Button label="Not this car? Change the model" kind="ghost" onPress={() => setStep('model')} />
          </View>
        ) : null}
        {fromVin ? (
          <AppText variant="title" accessibilityRole="header">
            Which engine?
          </AppText>
        ) : (
          header('Which engine?', `${model.make} ${model.model} · ${model.generation}`)
        )}
        <AppText variant="label" tone="muted">
          It’s on the registration document, the listing, or the back of the car. Not sure? Pick “Not sure”: you’ll see the problems for all
          engines.
        </AppText>
        {model.engines.map((e) => (
          <Row
            key={e.id}
            title={e.name}
            subtitle={FUELS.find((f) => f.value === e.fuel)?.label}
            onPress={() => {
              setEngine(e);
              pickYear(model, e);
            }}
          />
        ))}
        <Row
          title="Not sure"
          onPress={() => {
            setEngine(null);
            pickYear(model, null);
          }}
        />
        <Button label="Change the model" kind="ghost" onPress={() => setStep(make ? 'model' : 'make')} />
      </ScrollView>
    );
  }

  if (step === 'year' && model) {
    const years = Array.from({ length: model.years[1] - model.years[0] + 1 }, (_, i) => model.years[1] - i);
    return (
      <FlatList
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header('Which year?', `${model.make} ${model.model} · ${model.generation}`)}
        data={years}
        numColumns={3}
        columnWrapperStyle={{ gap: space.sm }}
        keyExtractor={(y) => String(y)}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={String(item)}
            onPress={() => {
              setYear(item);
              setStep('save');
            }}
            style={({ pressed }) => [styles.yearCell, { borderColor: t.border, backgroundColor: pressed ? t.sunken : t.surface }]}>
            <AppText variant="heading">{item}</AppText>
          </Pressable>
        )}
      />
    );
  }

  if (step === 'manual') {
    const canSave = manual.make.trim() && manual.model.trim();
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {header('Tell us about the car', 'Not in our list')}
          <AppText variant="label" tone="muted">
            You’ll still get the full inspection and verdict. We just won’t have model-specific problems for it yet.
          </AppText>
          <TextField
            label="Make"
            value={manual.make}
            onChangeText={(v) => setManual({ ...manual, make: v })}
            placeholder={tr('e.g. Lada')}
          />
          <TextField
            label="Model"
            value={manual.model}
            onChangeText={(v) => setManual({ ...manual, model: v })}
            placeholder={tr('e.g. Niva')}
          />
          <TextField
            label="Year"
            keyboardType="number-pad"
            value={manual.year}
            onChangeText={(v) => setManual({ ...manual, year: v })}
            placeholder={tr('e.g. 2012')}
          />
          <ChoiceChips label="Fuel" choices={FUELS} value={manual.fuel} onChange={(fuel) => setManual({ ...manual, fuel })} />
          <CarDetailsForm value={details} onChange={setDetails} />
          <Button
            label="Save and see the report"
            icon="arrow-forward"
            disabled={!canSave}
            loading={create.isPending}
            onPress={saveManual}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'save' && model) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          <CarHeader
            overline="Your car"
            title={[year, model.make, model.model].filter(Boolean).join(' ')}
            trim={model.generation}
            engineDesc={engine?.name ?? 'Engine not chosen'}
            powertrain={engine?.fuel ?? model.engines[0].fuel}
            vin={p.vin ?? null}
            kind={bodyKind(model.body[0])}
          />
          <Button label="Change" kind="ghost" onPress={() => setStep('engine')} />
          <CarDetailsForm value={details} onChange={setDetails} />
          <Button label="Save and see the report" icon="arrow-forward" loading={create.isPending} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Attach mode waits for the car; otherwise restart.
  if (attaching && attachCar.isPending) return null;
  return (
    <View style={[styles.list, { flex: 1, backgroundColor: t.bg }]}>
      <Button label="Start again" onPress={() => setStep('make')} />
    </View>
  );
}

const styles = StyleSheet.create({
  vinPick: { borderWidth: 1.5, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  list: { padding: space.xl, gap: space.sm, paddingBottom: space.xxxl },
  header: { gap: space.xs, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouch + 10,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
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
