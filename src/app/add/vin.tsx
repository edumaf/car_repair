// Type the VIN with live validation; a failed check digit warns but doesn't block (CLAUDE.md §6.2).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { checkVin } from '@/core/vin/vin';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { VinField } from '@/design/components/VinField';
import { space, useTheme } from '@/design/tokens';

export default function TypeVin() {
  const t = useTheme();
  const params = useLocalSearchParams<{ vin?: string }>();
  const [vin, setVin] = useState(params.vin ?? '');
  const check = checkVin(vin);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title">Type the VIN</AppText>
        <AppText tone="muted">
          It’s on the driver’s door-jamb sticker and at the base of the windshield (driver side). It’s also on the title and the listing.
        </AppText>
        <VinField value={vin} onChange={setVin} autoFocus />
        <Button
          label="Look it up"
          icon="search"
          disabled={check.problem !== null}
          onPress={() => router.push({ pathname: '/add/confirm', params: { vin: check.vin, method: 'vin_typed' } })}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.xl, gap: space.lg } });
