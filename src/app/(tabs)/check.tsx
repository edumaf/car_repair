import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { CarArt } from '@/design/components/CarArt';
import { Card } from '@/design/components/Card';
import { NightPanel } from '@/design/components/NightPanel';
import { Divider, Row } from '@/design/components/Row';
import { Screen } from '@/design/components/Screen';
import { Tag } from '@/design/components/Tag';
import { radius, space, useTheme } from '@/design/tokens';

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
          right={<Tag label="Soon" color="slate" />}
          disabled
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
