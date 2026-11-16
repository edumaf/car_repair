// Learn (CLAUDE.md §6.9): short offline guides.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Fragment } from 'react';

import { GUIDES } from '@/core/data/learn';
import { AppText } from '@/design/components/AppText';
import { Card } from '@/design/components/Card';
import { Divider, Row } from '@/design/components/Row';
import { Screen } from '@/design/components/Screen';
import { tr } from '@/core/i18n/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function LearnScreen() {
  return (
    <Screen overline="Learn" title="Buy smarter">
      <AppText tone="muted">Short guides you can read before you go. They work offline.</AppText>
      <Card>
        {GUIDES.map((g, i) => (
          <Fragment key={g.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              icon={g.icon as IconName}
              title={g.title}
              subtitle={tr('{n} min read', { n: g.minutes })}
              onPress={() => router.push({ pathname: '/learn/[id]', params: { id: g.id } })}
            />
          </Fragment>
        ))}
      </Card>
    </Screen>
  );
}
