// Learn (CLAUDE.md §6.9): short offline guides.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { GUIDES } from '@/core/data/learn';
import { AppText } from '@/design/components/AppText';
import { Card } from '@/design/components/Card';
import { Divider, Row } from '@/design/components/Row';
import { NightPanel } from '@/design/components/NightPanel';
import { Screen } from '@/design/components/Screen';
import { CarArt } from '@/design/components/CarArt';
import { space, useTheme } from '@/design/tokens';
import { tr } from '@/core/i18n/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function LearnScreen() {
  const t = useTheme();
  return (
    <Screen>
      <NightPanel style={styles.hero}>
        <View style={styles.art}>
          <CarArt kind="coupe" width={130} color={t.onNight} />
          <View style={[styles.lane, { backgroundColor: t.lane }]} />
        </View>
        <AppText variant="overline" tone="lane">
          Learn
        </AppText>
        <AppText variant="hero" tone="onNight" accessibilityRole="header">
          Buy smarter
        </AppText>
        <AppText tone="onNightMuted">Short guides you can read before you go. They work offline.</AppText>
      </NightPanel>
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

const styles = StyleSheet.create({
  hero: { gap: space.xs },
  art: { alignSelf: 'flex-end', marginBottom: space.xs },
  lane: { height: 3, borderRadius: 2, marginHorizontal: space.sm, marginTop: 2 },
});
