// Type the VIN with live validation; a failed check digit warns but doesn't block (CLAUDE.md §6.2).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { checkVin } from '@/core/vin/vin';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { VinField } from '@/design/components/VinField';
import { space, useTheme } from '@/design/tokens';
import { track } from '@/analytics/analytics';

export default function TypeVin() {
  const t = useTheme();
  const params = useLocalSearchParams<{ vin?: string; from?: 'photo' | 'sample' }>();
  const [vin, setVin] = useState(params.vin ?? '');
  const check = checkVin(vin);
  const lookUp = () => {
    if (!check.checkDigitOk) track('vin_check_digit_failed', {});
    router.push({ pathname: '/add/confirm', params: { vin: check.vin, method: params.from ? 'vin_photo' : 'vin_typed' } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <AppText variant="title">Type the VIN</AppText>
        <AppText tone="muted">
          It’s on the driver’s door-jamb sticker and at the base of the windshield (driver side). It’s also on the title and the listing.
        </AppText>
        {params.from ? (
          <AppText variant="label" tone={params.from === 'sample' ? 'caution' : 'brand'}>
            {params.from === 'sample'
              ? 'Sample VIN: reading photos needs our server, which isn’t switched on yet.'
              : 'Read by AI from your photo (then deleted). Check every character against the sticker before you look it up.'}
          </AppText>
        ) : null}
        <VinField value={vin} onChange={setVin} autoFocus={!params.from} onSubmit={() => check.problem === null && lookUp()} />
        <Button
          label="Look it up"
          icon="search"
          disabled={check.problem !== null}
          onPress={lookUp}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.xl, gap: space.lg } });
