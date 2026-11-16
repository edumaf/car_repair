import { Fragment } from 'react';

import { Card } from '@/design/components/Card';
import { AppText } from '@/design/components/AppText';
import { Divider, Row } from '@/design/components/Row';
import { Screen } from '@/design/components/Screen';

// Learn: short offline guides, written in Milestone 6 (CLAUDE.md §6.9). Titles only for now.
const GUIDES = [
  { icon: 'calendar-outline', title: 'Read a tire’s date code' },
  { icon: 'cash-outline', title: 'The penny tread test' },
  { icon: 'construct-outline', title: 'What a pre-purchase inspection is' },
  { icon: 'document-text-outline', title: 'Title brands explained' },
  { icon: 'shield-outline', title: 'Common used-car scams' },
  { icon: 'navigate-outline', title: 'Plan your test-drive route' },
  { icon: 'hardware-chip-outline', title: 'Use a $20 OBD2 reader' },
] as const;

export default function LearnScreen() {
  return (
    <Screen overline="Learn" title="Buy smarter">
      <AppText tone="muted">Short guides you can read before you go. Coming soon.</AppText>
      <Card>
        {GUIDES.map((g, i) => (
          <Fragment key={g.title}>
            {i > 0 ? <Divider /> : null}
            <Row icon={g.icon} title={g.title} disabled />
          </Fragment>
        ))}
      </Card>
    </Screen>
  );
}
