// Looks the car up (VIN or year/make/model), shows what we found, collects optional details, saves it.
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { vehicleClient } from '@/core/api/clients';
import { ApiError, type VehicleLookup } from '@/core/api/types';
import { engineFromDecode, findModelsByName } from '@/core/models/matchModels';
import type { Powertrain } from '@/core/types';
import { carTitle } from '@/db/carsRepository';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { CarHeader } from '@/design/components/CarHeader';
import { ErrorState, LoadingState } from '@/design/components/States';
import { space, useTheme } from '@/design/tokens';
import { CarDetailsForm, EMPTY_DETAILS, useDetailsValues } from '@/features/add/CarDetailsForm';
import { useCars, useCreateCar } from '@/hooks/useCars';
import { plural } from '@/core/i18n/i18n';
import { bodyKind } from '@/core/vehicle/bodyKind';

export default function ConfirmCar() {
  const t = useTheme();
  const p = useLocalSearchParams<{ vin?: string; year?: string; make?: string; model?: string; powertrain?: Powertrain }>();
  const lookup: VehicleLookup | null = p.vin
    ? { vin: p.vin }
    : p.year && p.make && p.model
      ? { year: Number(p.year), make: p.make, model: p.model, powertrainHint: p.powertrain }
      : null;

  const report = useQuery({
    queryKey: ['report', lookup],
    queryFn: () => vehicleClient.getReport(lookup!),
    enabled: !!lookup,
    staleTime: 3_600_000,
  });
  const cars = useCars();
  const create = useCreateCar();
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const values = useDetailsValues(details);
  const notFound = report.isError && report.error instanceof ApiError && report.error.code === 'not_found';

  // A VIN NHTSA doesn't know is usually a car built for another market: continue with our model list.
  useEffect(() => {
    if (notFound && p.vin) router.replace({ pathname: '/add/model', params: { vin: p.vin } });
  }, [notFound, p.vin]);

  if (!lookup) return <ErrorState title="Nothing to look up" message="Go back and enter a VIN or pick a car." />;
  if (report.isPending) return <LoadingState label="Looking up the car with NHTSA…" />;
  if (report.isError) {
    const e = report.error;
    const notFound = e instanceof ApiError && e.code === 'not_found';
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ErrorState
          title={notFound ? 'We couldn’t find this car' : 'Couldn’t reach NHTSA'}
          message={e.message}
          onRetry={notFound ? undefined : () => report.refetch()}
        />
        <View style={styles.errorActions}>
          {/* Our model list works offline, so it's the way forward when NHTSA can't be reached. */}
          <Button
            label="Pick make and model instead"
            icon="list-outline"
            onPress={() => router.replace({ pathname: '/add/model', params: p.vin ? { vin: p.vin } : {} })}
          />
          {p.vin ? (
            <Button
              label="Edit the VIN"
              kind="secondary"
              onPress={() => router.replace({ pathname: '/add/vin', params: { vin: p.vin } })}
            />
          ) : null}
        </View>
      </View>
    );
  }

  const r = report.data;
  const d = r.decode;
  const existing = d.vin ? cars.data?.find((c) => c.vin === d.vin) : undefined;
  const powertrain = p.vin ? d.powertrain : (p.powertrain ?? d.powertrain);

  // Close the add-car screens, then open the car on top of the tabs (Back returns to the garage).
  const openCar = (id: string) => {
    if (router.canDismiss()) router.dismissAll();
    router.push({ pathname: '/car/[id]', params: { id } });
  };

  // Link to our model database when exactly one generation fits; the engine when the fuel and the engine size
  // NHTSA decoded from the VIN point to exactly one engine.
  const matches = findModelsByName(d.make, d.model, d.year);
  const matched = matches.length === 1 ? matches[0] : null;
  const engine = matched ? engineFromDecode(matched, powertrain, d.engineDesc) : null;

  const save = async () => {
    const id = await create.mutateAsync({
      report: r,
      powertrain,
      modelId: matched?.id ?? null,
      engineId: engine?.id ?? null,
      ...values,
    });
    openCar(id);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CarHeader
          overline="We found"
          title={carTitle(d)}
          trim={d.trim}
          engineDesc={d.engineDesc}
          drive={d.drive}
          powertrain={powertrain}
          vin={d.vin}
          kind={bodyKind(d.body)}
        />
        {d.decodeWarnings.length > 0 && p.vin ? (
          <AppText variant="caption" tone="caution">
            NHTSA flagged parts of this VIN as unusual. Compare it with the door sticker and the title.
          </AppText>
        ) : null}
        <Card>
          <AppText variant="label">
            {r.recalls === null
              ? 'Recalls unavailable right now'
              : plural(r.recalls.length, '{n} recall', '{n} recalls', '{n} de rechemări')}{' '}
            ·{' '}
            {r.complaints === null
              ? 'complaints unavailable'
              : plural(r.complaints.total, '{n} owner complaint', '{n} owner complaints', '{n} de reclamații de la proprietari')}
          </AppText>
          <AppText variant="caption" tone="muted">
            Full details on the next screen.
          </AppText>
        </Card>

        {existing ? (
          <Card>
            <AppText variant="bodyStrong">This car is already in your garage.</AppText>
            <Button label="Open it" kind="secondary" onPress={() => openCar(existing.id)} />
          </Card>
        ) : null}

        <CarDetailsForm value={details} onChange={setDetails} />

        <Button label="Save and see the report" icon="arrow-forward" loading={create.isPending} onPress={save} />
        <AppText variant="caption" tone="muted" align="center">
          Data: U.S. National Highway Traffic Safety Administration (NHTSA). Not affiliated with NHTSA or any manufacturer.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl },
  errorActions: { padding: space.xl, gap: space.sm },
});
