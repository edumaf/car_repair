// Paywall (CLAUDE.md §9). The 30-day pass is pre-selected. Real purchases arrive with RevenueCat in the dev build;
// until then this screen explains that and, in dev builds, offers the "simulate premium" switch.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { paywallHeadline, type PaywallPlacement } from '@/core/limits';
import { META, getMeta } from '@/db/appMeta';
import { getDb, saveFlag } from '@/db/db';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Tag } from '@/design/components/Tag';
import { minTouch, radius, space, useTheme } from '@/design/tokens';
import { tr } from '@/core/i18n/i18n';

const PLANS = [
  {
    id: 'car_hunt_pass_30d',
    title: '30-day Car Hunt Pass',
    price: '$14.99',
    detail: 'One payment, no subscription',
    badge: 'Most popular',
  },
  {
    id: 'pro_annual',
    title: 'Pro, yearly',
    get price() {
      return tr('{price} / year', { price: '$39.99' });
    },
    detail: 'For checking many cars. Renews yearly; cancel anytime.',
    badge: null,
  },
] as const;

const BENEFITS = [
  { icon: 'clipboard-outline', text: 'Unlimited inspections and AI photo checks' },
  { icon: 'pricetag-outline', text: 'Price check against similar listings' },
  { icon: 'git-compare-outline', text: 'Compare cars side by side' },
  { icon: 'images-outline', text: 'Listing screenshots checked for red flags' },
  { icon: 'share-outline', text: 'Share cards without the "Free check" mark' },
] as const;

const REASON: Record<PaywallPlacement, string | null> = {
  first_report: null,
  second_inspection: 'Your free inspection was used on another car.',
  photo_limit: 'You’ve used the 10 free AI photo checks.',
  premium_feature: 'This is a Premium feature.',
};

export default function Paywall() {
  const t = useTheme();
  const { placement = 'first_report' } = useLocalSearchParams<{ placement?: PaywallPlacement }>();
  const [plan, setPlan] = useState<(typeof PLANS)[number]['id']>('car_hunt_pass_30d');
  const answers = useQuery({
    queryKey: ['meta', 'onboarding'],
    queryFn: async () => JSON.parse((await getMeta(getDb(), META.onboardingAnswers)) ?? '{}') as Record<string, string>,
  });

  const buy = () => {
    if (__DEV__) {
      Alert.alert(
        'Purchases come with the test build',
        'In Expo Go, purchases can’t run. Turn on simulated Premium to try Premium features?',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Simulate Premium',
            onPress: async () => {
              await saveFlag('simulatePremium', true);
              router.back();
            },
          },
        ],
      );
    } else {
      Alert.alert('Not available yet', 'Purchases will be available soon.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: t.bg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('Close')}
        onPress={() => router.back()}
        style={styles.close}
        hitSlop={10}>
        <Ionicons name="close" size={28} color={t.ink} />
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        {REASON[placement as PaywallPlacement] ? (
          <AppText variant="label" tone="muted">
            {REASON[placement as PaywallPlacement]}
          </AppText>
        ) : null}
        <AppText variant="display" accessibilityRole="header">
          {paywallHeadline(answers.data?.worry)}
        </AppText>
        <View style={{ gap: space.sm }}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <Ionicons name={b.icon} size={20} color={t.brand} />
              <AppText style={{ flex: 1 }}>{b.text}</AppText>
            </View>
          ))}
        </View>
        {PLANS.map((p) => {
          const on = plan === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${tr(p.title)}, ${p.price}. ${tr(p.detail)}`}
              onPress={() => setPlan(p.id)}
              style={[styles.plan, { borderColor: on ? t.brand : t.border, backgroundColor: on ? t.tint.brand : t.surface }]}>
              <View style={{ flex: 1, gap: 2 }}>
                {p.badge ? <Tag label={p.badge} color="brand" /> : null}
                <AppText variant="heading">{p.title}</AppText>
                <AppText variant="label" tone="muted">
                  {p.detail}
                </AppText>
              </View>
              <AppText variant="bodyStrong">{p.price}</AppText>
            </Pressable>
          );
        })}
        <AppText variant="label" tone="muted" align="center">
          No subscription on the pass. It simply ends after 30 days.
        </AppText>
        <Button label="Continue" icon="arrow-forward" onPress={buy} />
        <Button
          label="Restore purchases"
          kind="ghost"
          onPress={() => Alert.alert('Nothing to restore yet', 'Purchases arrive with the test build.')}
        />
        <AppText variant="caption" tone="faint" align="center">
          Prices are examples until the store products exist. Terms of use and privacy policy links will be added before launch.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  close: { alignSelf: 'flex-end', padding: space.lg, minHeight: minTouch },
  content: { padding: space.xl, paddingTop: 0, gap: space.lg, paddingBottom: space.xxxl },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 2 },
});
