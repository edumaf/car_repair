// Paywall (CLAUDE.md §9). The 30-day pass is pre-selected. Real purchases arrive with RevenueCat in the dev build;
// until then this screen explains that and, in dev builds, offers the "simulate premium" switch.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { paywallHeadline, type PaywallPlacement } from '@/core/limits';
import { META, getMeta } from '@/db/appMeta';
import { getDb, saveFlag } from '@/db/db';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { RoadScene } from '@/design/components/RoadScene';
import { Tag } from '@/design/components/Tag';
import { minTouch, radius, space, useTheme } from '@/design/tokens';
import { tr } from '@/core/i18n/i18n';
import { track } from '@/analytics/analytics';

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
  const { placement = 'first_report', freeCar } = useLocalSearchParams<{ placement?: PaywallPlacement; freeCar?: string }>();
  const reason =
    placement === 'second_inspection' && freeCar
      ? tr('Your free inspection is on the {car}.', { car: freeCar })
      : REASON[placement as PaywallPlacement];
  const [plan, setPlan] = useState<(typeof PLANS)[number]['id']>('car_hunt_pass_30d');
  const answers = useQuery({
    queryKey: ['meta', 'onboarding'],
    queryFn: async () => JSON.parse((await getMeta(getDb(), META.onboardingAnswers)) ?? '{}') as Record<string, string>,
  });

  useEffect(() => track('paywall_shown', { placement }), [placement]);

  const buy = () => {
    track('purchase_started', { product: plan });
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
              track('purchase_completed', { product: plan });
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
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={[styles.hero, { backgroundColor: t.night }]}>
          <SafeAreaView edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('Close')}
              onPress={() => router.back()}
              style={styles.close}
              hitSlop={10}>
              <Ionicons name="close" size={28} color={t.onNight} />
            </Pressable>
          </SafeAreaView>
          <View style={styles.heroText}>
            <AppText variant="overline" tone="lane">
              {reason ?? 'Used Car Check Premium'}
            </AppText>
            <AppText variant="hero" tone="onNight" accessibilityRole="header" style={styles.headline}>
              {paywallHeadline(answers.data?.worry)}
            </AppText>
          </View>
          <RoadScene hero="suv" heroWidth={150} height={110} />
        </View>
        <View style={styles.content}>
          <View style={{ gap: space.sm }}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefit}>
                <View style={[styles.benefitIcon, { backgroundColor: t.night }]}>
                  <Ionicons name={b.icon} size={18} color={t.lane} />
                </View>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  hero: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, overflow: 'hidden', paddingBottom: space.sm },
  heroText: { paddingHorizontal: space.xl, gap: space.sm },
  headline: { fontSize: 46, lineHeight: 46 },
  close: { alignSelf: 'flex-end', padding: space.lg, minHeight: minTouch, minWidth: minTouch },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  benefitIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 2 },
});
