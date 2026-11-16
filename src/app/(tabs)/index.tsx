import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Screen } from '@/design/components/Screen';
import { radius, space, useTheme } from '@/design/tokens';

// Garage: saved cars with verdict badges and compare (Milestone 5). For now, the empty state.
export default function GarageScreen() {
  const t = useTheme();
  return (
    <Screen overline="Your garage" title="Cars you’re checking">
      <Card style={styles.empty}>
        <View style={[styles.badge, { backgroundColor: t.tint.brand }]}>
          <Ionicons name="car-sport-outline" size={34} color={t.brand} />
        </View>
        <AppText variant="hero" align="center">
          Don’t buy a lemon.
        </AppText>
        <AppText tone="muted" align="center">
          Add the car you’re looking at. We’ll pull its recalls and known problem areas, then guide you through a 15-minute check.
        </AppText>
        <View style={styles.cta}>
          <Button label="Check a car" icon="scan" onPress={() => router.navigate('/check')} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: space.xxl, gap: space.md },
  badge: { width: 72, height: 72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cta: { alignSelf: 'stretch', marginTop: space.sm },
});
