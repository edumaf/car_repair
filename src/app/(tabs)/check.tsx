import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

import { listingClient } from '@/core/api/clients';
import { aiIsSample } from '@/core/api/mode';
import { tr } from '@/core/i18n/i18n';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { CarArt } from '@/design/components/CarArt';
import { Card } from '@/design/components/Card';
import { NightPanel } from '@/design/components/NightPanel';
import { Divider, Row } from '@/design/components/Row';
import { Screen } from '@/design/components/Screen';
import { radius, space, useTheme } from '@/design/tokens';
import { PhotoPermissionError, captureTempPhoto, deleteTempImages, type PhotoSource } from '@/media/photos';

/** Where the VIN is: a car outline with the two usual spots marked in road-paint yellow. */
function VinSpots() {
  const t = useTheme();
  return (
    <View style={styles.spots} accessible={false} importantForAccessibility="no-hide-descendants">
      <CarArt kind="sedan" width={180} color={t.onNight} />
      {/* Windshield (driver side) and door jamb (B-pillar), in drawing coordinates scaled from 240×100. */}
      <View style={[styles.spot, { left: (172 / 240) * 180 - 7, top: (44 / 100) * 75 - 7, borderColor: t.lane }]} />
      <View style={[styles.spot, { left: (128 / 240) * 180 - 7, top: (64 / 100) * 75 - 7, borderColor: t.lane }]} />
    </View>
  );
}

// Add a car (CLAUDE.md §6.2).
export default function CheckScreen() {
  const t = useTheme();
  const [reading, setReading] = useState(false);

  // VIN photo → our server reads the 17 characters (free, daily cap) → the user checks them on the VIN screen.
  const readVinPhoto = async (source: PhotoSource) => {
    let uri: string | null = null;
    try {
      uri = await captureTempPhoto(source);
      if (!uri) return;
      setReading(true);
      const { vin } = await listingClient.readVin(uri);
      if (vin) router.push({ pathname: '/add/vin', params: { vin, from: aiIsSample() ? 'sample' : 'photo' } });
      else Alert.alert('Couldn’t read the VIN', 'Try again a bit closer, without glare, or type it.');
    } catch (e) {
      if (e instanceof PhotoPermissionError) Alert.alert('Permission needed', tr('{message} Turn it on in the iPhone Settings app.', { message: tr(e.message) }));
      else Alert.alert('Couldn’t read the VIN', tr((e as Error).message));
    } finally {
      if (uri) deleteTempImages([uri]);
      setReading(false);
    }
  };
  const askSource = () => {
    // The browser preview has no camera and no multi-button alerts: go straight to the photo library there.
    if (Platform.OS === 'web') return void readVinPhoto('library');
    Alert.alert('Photo of the VIN', 'Door-jamb sticker or the plate at the base of the windshield.', [
      { text: 'Take a photo', onPress: () => readVinPhoto('camera') },
      { text: 'Choose from photos', onPress: () => readVinPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  return (
    <Screen>
      <NightPanel style={styles.hero}>
        <AppText variant="overline" tone="lane">
          Check a car
        </AppText>
        <AppText variant="hero" tone="onNight" accessibilityRole="header">
          Start with the VIN
        </AppText>
        <AppText tone="onNightMuted">The 17-character code on the windshield or the driver’s door frame.</AppText>
        <VinSpots />
        <Button label="Scan the VIN barcode" kind="road" icon="barcode-outline" onPress={() => router.push('/add/scan')} />
        <View style={[styles.typeRow, { borderColor: t.nightRaised }]}>
          <Button label="Type the VIN instead" kind="roadGhost" icon="keypad-outline" onPress={() => router.push('/add/vin')} />
        </View>
      </NightPanel>

      <AppText variant="overline" tone="muted">
        No VIN yet?
      </AppText>
      <Card>
        <Row
          icon="list-outline"
          title="Pick make and model"
          subtitle="Works for cars from any country"
          onPress={() => router.push('/add/model')}
        />
        <Divider />
        <Row
          icon="flag-outline"
          title="US car not in our list?"
          subtitle="Search every US model in NHTSA’s list"
          onPress={() => router.push('/add/ymm')}
        />
        <Divider />
        <Row
          icon="camera-outline"
          title="Take a photo of the VIN"
          subtitle="We read the 17 characters for you"
          right={reading ? <ActivityIndicator color={t.brand} /> : undefined}
          onPress={reading ? undefined : askSource}
        />
      </Card>
      <AppText variant="caption" tone="muted">
        Recall, complaint and rating data: U.S. National Highway Traffic Safety Administration (NHTSA). Not affiliated with NHTSA or any
        manufacturer.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md },
  spots: { alignSelf: 'center', width: 180, height: 75, marginVertical: space.sm },
  spot: { position: 'absolute', width: 14, height: 14, borderRadius: radius.pill, borderWidth: 3 },
  typeRow: { borderTopWidth: 1, marginHorizontal: -space.xl, marginBottom: -space.md, paddingHorizontal: space.md },
});
