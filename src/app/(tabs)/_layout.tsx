import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/tokens';
import { fonts } from '@/design/typography';
import { getFlags } from '@/state/appFlags';
import { tr } from '@/core/i18n/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, inactive: IconName) {
  return function TabIcon({ focused, size }: { focused: boolean; size: number }) {
    const t = useTheme();
    return <Ionicons name={focused ? active : inactive} color={focused ? t.brand : t.faint} size={size} />;
  };
}

/** The center "Check" tab is the main action: a raised night-road button with a road-paint icon. */
function CheckIcon({ focused }: { focused: boolean }) {
  const t = useTheme();
  return (
    // The slot keeps the normal icon size so labels stay aligned; the button rises out of it.
    <View style={styles.slot}>
      <View style={[styles.check, { backgroundColor: t.night, borderColor: focused ? t.lane : t.surface }]}>
        <Ionicons name="scan" size={26} color={t.lane} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const t = useTheme();
  // First launch: onboarding first (flags are loaded before the app renders).
  if (!getFlags().onboardingDone) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.faint,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: tr('Garage'), tabBarIcon: icon('car-sport', 'car-sport-outline') }} />
      <Tabs.Screen name="diagnose" options={{ title: tr('Diagnose'), tabBarIcon: icon('pulse', 'pulse-outline') }} />
      <Tabs.Screen name="check" options={{ title: tr('Check'), tabBarIcon: CheckIcon, tabBarAccessibilityLabel: tr('Check a car') }} />
      <Tabs.Screen name="learn" options={{ title: tr('Learn'), tabBarIcon: icon('book', 'book-outline') }} />
      <Tabs.Screen name="settings" options={{ title: tr('Settings'), tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slot: { width: 56, height: 24, alignItems: 'center' },
  check: {
    position: 'absolute',
    bottom: -2,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
});
