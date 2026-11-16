import { router } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Card } from '@/design/components/Card';
import { Divider, Row } from '@/design/components/Row';
import { Screen } from '@/design/components/Screen';
import { Tag } from '@/design/components/Tag';

// Add a car (CLAUDE.md §6.2).
export default function CheckScreen() {
  return (
    <Screen overline="Check a car" title="Add the car you’re looking at">
      <Card>
        <Row
          icon="barcode-outline"
          title="Scan the VIN barcode"
          subtitle="Door-jamb sticker or windshield"
          onPress={() => router.push('/add/scan')}
        />
        <Divider />
        <Row icon="keypad-outline" title="Type the VIN" subtitle="17 letters and numbers" onPress={() => router.push('/add/vin')} />
        <Divider />
        <Row icon="list-outline" title="No VIN yet?" subtitle="Pick year, make and model" onPress={() => router.push('/add/ymm')} />
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
