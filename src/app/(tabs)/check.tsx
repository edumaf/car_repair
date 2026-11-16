import { Card } from '@/design/components/Card';
import { AppText } from '@/design/components/AppText';
import { Divider, Row } from '@/design/components/Row';
import { Screen } from '@/design/components/Screen';
import { Tag } from '@/design/components/Tag';

// Add a car (CLAUDE.md §6.2). The four ways in are wired up in Milestone 1.
const soon = <Tag label="Next" color="slate" />;

export default function CheckScreen() {
  return (
    <Screen overline="Check a car" title="Add the car you’re looking at">
      <Card>
        <Row icon="barcode-outline" title="Scan the VIN barcode" subtitle="Door-jamb sticker or windshield" right={soon} disabled />
        <Divider />
        <Row icon="camera-outline" title="Take a photo of the VIN" subtitle="We read the 17 characters for you" right={soon} disabled />
        <Divider />
        <Row icon="keypad-outline" title="Type the VIN" subtitle="17 letters and numbers" right={soon} disabled />
        <Divider />
        <Row icon="list-outline" title="No VIN yet?" subtitle="Pick year, make and model" right={soon} disabled />
      </Card>
      <AppText variant="caption" tone="muted">
        Recall, complaint and rating data: U.S. National Highway Traffic Safety Administration (NHTSA). Not affiliated with NHTSA or any
        manufacturer.
      </AppText>
    </Screen>
  );
}
