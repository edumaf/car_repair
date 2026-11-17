// Vehicle report (CLAUDE.md §6.3): decode header, recalls, owner-complaint problem areas, crash rating, CTA.
// Everything shown here comes from NHTSA responses stored with the car.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listingClient, vehicleClient } from '@/core/api/clients';
import { aiIsSample } from '@/core/api/mode';
import { ApiError, type VehicleLookup } from '@/core/api/types';
import { listingFlagsForCar } from '@/core/listing/fieldFlags';
import { listingOverall } from '@/core/listing/matchListingFlags';
import type { PriceCheckResult } from '@/core/price/priceCheck';
import { formatNumber, historyLinks, money } from '@/core/region';
import { complaintGroupLabel, recallComponentLabel } from '@/core/vehicle/labels';
import type { ComplaintGroupStat, Recall, VehicleReport } from '@/core/vehicle/types';
import { carTitle, type CarRecord } from '@/db/carsRepository';
import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { CarHeader } from '@/design/components/CarHeader';
import { ProblemAreaBar } from '@/design/components/ProblemAreaBar';
import { Divider } from '@/design/components/Row';
import { ErrorState, LoadingState } from '@/design/components/States';
import { Tag } from '@/design/components/Tag';
import { TextField } from '@/design/components/TextField';
import { space, useTheme, type SignalColor } from '@/design/tokens';
import { canInspectFree } from '@/core/limits';
import { META, getMeta, setMeta } from '@/db/appMeta';
import { getDb, saveFlag } from '@/db/db';
import { ModelCard } from '@/features/model/ModelCard';
import { usePremium } from '@/hooks/usePremium';
import { usePriceCheck } from '@/hooks/usePriceCheck';
import { PhotoPermissionError, deleteTempImages, pickScreenshots } from '@/media/photos';
import { getFlags } from '@/state/appFlags';
import { useCar, useDeleteCar, useUpdateCar } from '@/hooks/useCars';
import { useRegion } from '@/hooks/useRegion';
import { tr } from '@/core/i18n/i18n';
import { getModel } from '@/core/data/knowledge';
import { bodyKind } from '@/core/vehicle/bodyKind';
import { track } from '@/analytics/analytics';
import { recallsBucket } from '@/core/analyticsEvents';

function RecallItem({ recall }: { recall: Recall }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={tr('Recall: {component}', { component: tr(recallComponentLabel(recall.component)) })}
      accessibilityHint={open ? 'Hides details' : 'Shows details'}
      onPress={() => setOpen((x) => !x)}
      style={styles.recall}>
      <View style={styles.recallHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">{recallComponentLabel(recall.component)}</AppText>
          <AppText variant="caption" tone="muted">
            Campaign {recall.campaign}
            {recall.reportDate ? ` · ${recall.reportDate.slice(0, 4)}` : ''}
          </AppText>
        </View>
        <AppText tone="brand" variant="label">
          {open ? 'Less' : 'More'}
        </AppText>
      </View>
      {recall.parkIt ? <Tag label="NHTSA: don’t drive until fixed" color="stop" icon="warning" /> : null}
      {recall.parkOutside ? <Tag label="NHTSA: park outside (fire risk)" color="stop" icon="flame" /> : null}
      <AppText variant="label" numberOfLines={open ? undefined : 2}>
        {recall.summary}
      </AppText>
      {open && recall.consequence ? (
        <AppText variant="caption" tone="muted">
          Risk: {recall.consequence}
        </AppText>
      ) : null}
      {open && recall.remedy ? (
        <AppText variant="caption" tone="muted">
          Fix: {recall.remedy}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const RECALLS_SHOWN = 3;

function RecallsCard({ recalls }: { recalls: Recall[] | null }) {
  const [all, setAll] = useState(false);
  return (
    <Card>
      <AppText variant="overline" tone="muted">
        Safety recalls
      </AppText>
      {recalls === null ? (
        <AppText tone="muted">Recalls couldn’t be loaded right now. Pull down to try again.</AppText>
      ) : recalls.length === 0 ? (
        <AppText>No recalls found for this model year.</AppText>
      ) : (
        <>
          <AppText variant="title">
            {recalls.length} recall{recalls.length === 1 ? '' : 's'}
          </AppText>
          <AppText variant="label" tone="muted">
            Ask the seller for proof each recall was completed. Recall repairs are free at dealers.
          </AppText>
          {(all ? recalls : recalls.slice(0, RECALLS_SHOWN)).map((r) => (
            <View key={r.campaign} style={{ gap: space.sm }}>
              <Divider />
              <RecallItem recall={r} />
            </View>
          ))}
          {recalls.length > RECALLS_SHOWN ? (
            <Button
              label={all ? 'Show fewer' : tr('Show all {n} recalls', { n: recalls.length })}
              kind="ghost"
              onPress={() => setAll((x) => !x)}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

function ProblemAreasCard({ report }: { report: VehicleReport }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const c = report.complaints;
  const top: ComplaintGroupStat[] = c?.groups.slice(0, 5) ?? [];
  return (
    <Card>
      <AppText variant="overline" tone="muted">
        Owner-complaint problem areas
      </AppText>
      {c === null ? (
        <AppText tone="muted">Complaints couldn’t be loaded right now. Pull down to try again.</AppText>
      ) : c.total === 0 ? (
        <AppText>NHTSA has no owner complaints on file for this model year.</AppText>
      ) : (
        <>
          <AppText variant="label" tone="muted">
            {formatNumber(c.total)} complaints from owners
            {c.crashes || c.fires ? ` · ${tr('{crashes} mention a crash, {fires} a fire', { crashes: c.crashes, fires: c.fires })}` : ''}
          </AppText>
          {top.map((g) => (
            <Pressable
              key={g.group}
              accessibilityRole="button"
              accessibilityState={{ expanded: openGroup === g.group }}
              accessibilityHint={tr('Shows what owners wrote')}
              onPress={() => setOpenGroup(openGroup === g.group ? null : g.group)}
              style={{ gap: space.sm }}>
              <ProblemAreaBar label={complaintGroupLabel(g.group)} count={g.count} max={top[0].count} />
              {openGroup === g.group
                ? g.samples.map((sample, i) => (
                    <AppText key={i} variant="caption" tone="muted" style={styles.quote}>
                      “{sample}”
                    </AppText>
                  ))
                : null}
            </Pressable>
          ))}
          <AppText variant="caption" tone="muted">
            Tap a bar to read what owners wrote. Complaints are unverified reports from owners; popular models get more complaints.
          </AppText>
        </>
      )}
    </Card>
  );
}

function SafetyCard({ report }: { report: VehicleReport }) {
  const t = useTheme();
  const s = report.safety;
  return (
    <Card>
      <AppText variant="overline" tone="muted">
        NHTSA crash-test rating
      </AppText>
      {s?.overall ? (
        <View style={styles.stars} accessible accessibilityLabel={tr('Overall rating {n} out of 5 stars', { n: s.overall })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons key={n} name={n <= s.overall! ? 'star' : 'star-outline'} size={22} color={t.ink} />
          ))}
          <AppText variant="label" tone="muted">
            {' '}
            {s.overall}/5 overall
          </AppText>
        </View>
      ) : (
        <AppText tone="muted">Not rated by NHTSA for this model year.</AppText>
      )}
    </Card>
  );
}

const SELLER_LABELS = { private: 'Private seller', dealer: 'Dealer', unknown: 'Seller not set' } as const;

function DetailsCard({ car }: { car: CarRecord }) {
  const seller = tr(SELLER_LABELS[car.sellerType]);
  return (
    <View style={styles.details}>
      <AppText variant="label" tone="muted">
        {[
          car.askingPrice != null ? tr('Asking {price}', { price: money(car.askingPrice) }) : tr('No asking price'),
          car.mileage != null ? `${formatNumber(car.mileage)} ${car.mileageUnit}` : null,
          seller,
        ]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
    </View>
  );
}

const OVERALL = {
  looks_normal: { label: 'Looks normal', color: 'go', icon: 'checkmark-circle' },
  ask_questions: { label: 'Ask questions', color: 'caution', icon: 'help-circle' },
  possible_scam: { label: 'Possible scam', color: 'stop', icon: 'warning' },
} as const;
const FLAG_COLOR: Record<string, SignalColor> = { scam: 'stop', critical: 'stop', major: 'warn', caution: 'caution' };
const FLAG_LABEL: Record<string, string> = { scam: 'Scam pattern', critical: 'Serious', major: 'Needs proof', caution: 'Worth asking' };

/** Listing check, pasted text (CLAUDE.md §6.6): instant, on-device matching against our red-flag list. */
function ListingCard({
  car,
  priceResult,
  premium,
  onSave,
  onFill,
}: {
  car: CarRecord;
  priceResult: PriceCheckResult | null;
  premium: boolean;
  onSave: (text: string | null) => void;
  /** Asking price / mileage read from screenshots, for the fields the user hasn't filled in. */
  onFill: (fields: { askingPrice?: number; mileage?: number }) => void;
}) {
  const [editing, setEditing] = useState(!car.listingText);
  const [text, setText] = useState(car.listingText ?? '');
  const [reading, setReading] = useState(false);
  const [readFrom, setReadFrom] = useState<'ai' | 'sample' | null>(null);
  const matches = listingFlagsForCar(car, priceResult);
  const overall = OVERALL[listingOverall(matches)];

  // Screenshots of the ad → our server reads the text (Premium, CLAUDE.md §9) → the user checks it, then we match.
  const readScreenshots = async () => {
    if (!premium) {
      router.push({ pathname: '/paywall', params: { placement: 'premium_feature' } });
      return;
    }
    let uris: string[] = [];
    try {
      uris = await pickScreenshots(3);
      if (!uris.length) return;
      setReading(true);
      const r = await listingClient.extractListing(uris);
      setText(r.extracted_text);
      setReadFrom(aiIsSample() ? 'sample' : 'ai');
      setEditing(true);
      const fill: { askingPrice?: number; mileage?: number } = {};
      if (car.askingPrice == null && r.fields.price) fill.askingPrice = r.fields.price;
      if (car.mileage == null && r.fields.mileage) fill.mileage = r.fields.mileage;
      if (Object.keys(fill).length) onFill(fill);
    } catch (e) {
      if (e instanceof PhotoPermissionError) Alert.alert('Permission needed', tr('{message} Turn it on in the iPhone Settings app.', { message: tr(e.message) }));
      else if (e instanceof ApiError && e.code === 'quota_exceeded') router.push({ pathname: '/paywall', params: { placement: 'premium_feature' } });
      else Alert.alert('Couldn’t read the screenshots', tr((e as Error).message));
    } finally {
      deleteTempImages(uris);
      setReading(false);
    }
  };

  return (
    <Card>
      <AppText variant="overline" tone="muted">
        Listing check
      </AppText>
      {editing ? (
        <>
          <Button
            label={premium ? 'Read it from screenshots' : 'Read it from screenshots (Premium)'}
            icon="images-outline"
            kind="secondary"
            loading={reading}
            onPress={readScreenshots}
          />
          {readFrom ? (
            <AppText variant="caption" tone={readFrom === 'sample' ? 'caution' : 'muted'}>
              {readFrom === 'sample'
                ? 'Sample text: reading screenshots needs our server, which isn’t switched on yet.'
                : 'Read by AI from your screenshots, which were then deleted. Check the text: AI can misread.'}
            </AppText>
          ) : null}
          <TextField
            label="Or paste the listing text"
            multiline
            value={text}
            onChangeText={setText}
            placeholder={tr('Copy the ad’s description from Facebook Marketplace, Craigslist or a dealer site and paste it here.')}
          />
          <Button
            label="Check the listing"
            icon="search"
            kind="secondary"
            disabled={!text.trim()}
            onPress={() => {
              const saved = text.trim() || null;
              track('listing_check_result', {
                overall: listingOverall(listingFlagsForCar({ ...car, listingText: saved }, priceResult)),
                source: readFrom ? 'screenshot' : 'paste',
              });
              onSave(saved);
              setEditing(false);
            }}
          />
          <AppText variant="caption" tone="muted">
            Pasted text is checked on your phone against common warning signs. Nothing is uploaded.
          </AppText>
        </>
      ) : (
        <>
          <Tag label={overall.label} color={overall.color} icon={overall.icon} />
          {matches.length === 0 ? (
            <AppText variant="label" tone="muted">
              No common warning signs in the listing text. Still meet in a safe place and see the title before you pay.
            </AppText>
          ) : (
            matches.map((m) => (
              <View key={m.flag.id} style={{ gap: space.xs }}>
                <Divider />
                <Tag label={FLAG_LABEL[m.flag.severity]} color={FLAG_COLOR[m.flag.severity]} />
                {m.matched.length ? <AppText variant="bodyStrong">“{m.matched.join('”, “')}”</AppText> : null}
                <AppText variant="label">{m.flag.explanation}</AppText>
                <AppText variant="label" tone="brand">
                  {tr('Ask: {question}', { question: tr(m.flag.ask_seller) })}
                </AppText>
              </View>
            ))
          )}
          <AppText variant="caption" tone="muted">
            These are common warning signs, not proof of anything. Ask the seller about them.
          </AppText>
          <Button label="Edit the listing text" kind="ghost" onPress={() => setEditing(true)} />
        </>
      )}
    </Card>
  );
}

/** For cars outside NHTSA's coverage: say so plainly and link to official history checks for the region. */
function OtherMarketCard() {
  const region = useRegion();
  const links = historyLinks(region);
  return (
    <Card>
      <AppText variant="overline" tone="muted">
        Recalls and owner complaints
      </AppText>
      <AppText variant="label">
        Official recall and complaint data isn’t available for cars sold outside the US yet. The model’s known problems above come from our
        own database.
      </AppText>
      {links.map((l) => (
        <View key={l.url} style={{ gap: space.xs }}>
          <Button label={l.label} kind="secondary" icon="open-outline" onPress={() => Linking.openURL(l.url)} />
          <AppText variant="caption" tone="muted">
            {l.note}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

export default function CarReport() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const car = useCar(id);
  const update = useUpdateCar(id);
  const remove = useDeleteCar();
  const [refreshing, setRefreshing] = useState(false);
  const premium = usePremium();
  const priceResult = usePriceCheck(id).result;
  const loaded = !!car.data;

  // §14: once per opening of the report (counts only, no VIN).
  const reportFacts = car.data
    ? `${recallsBucket(car.data.report?.recalls?.length)}|${(car.data.report?.complaints?.total ?? 0) > 0}|${car.data.report?.coverage ?? 'nhtsa'}`
    : null;
  useEffect(() => {
    if (!reportFacts) return;
    const [recalls_count, hasComplaints, coverage] = reportFacts.split('|');
    track('vehicle_report_viewed', { recalls_count, has_complaints: hasComplaints === 'true', coverage: coverage as 'nhtsa' | 'none' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!reportFacts]);

  // Paywall placement 1 (CLAUDE.md §9): once, after the first vehicle report. Dismissible.
  useEffect(() => {
    if (!loaded || premium || getFlags().firstPaywallShown) return;
    const timer = setTimeout(() => {
      saveFlag('firstPaywallShown', true);
      router.push({ pathname: '/paywall', params: { placement: 'first_report' } });
    }, 1200);
    return () => clearTimeout(timer);
  }, [loaded, premium]);

  if (car.isPending) return <LoadingState label="Opening…" />;
  if (!car.data) return <ErrorState title="Car not found" message="It may have been removed." />;
  const c = car.data;
  const report = c.report;

  const refresh = async () => {
    if (report?.coverage === 'none') return; // nothing to fetch for cars outside NHTSA's coverage
    setRefreshing(true);
    try {
      const lookup: VehicleLookup = c.vin
        ? { vin: c.vin }
        : { year: c.year!, make: c.make!, model: c.model!, powertrainHint: c.powertrain };
      const fresh = await vehicleClient.getReport(lookup);
      await update.mutateAsync({ report: fresh });
    } catch (e) {
      Alert.alert('Couldn’t refresh', (e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Remove this car?', 'Its checks, notes and photos will be deleted from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(c.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <CarHeader
          overline="Vehicle report"
          title={carTitle(c)}
          trim={c.trim}
          engineDesc={c.engineDesc}
          drive={c.drive}
          powertrain={c.powertrain}
          vin={c.vin}
          kind={bodyKind(c.body, c.modelId ? getModel(c.modelId)?.body[0] : null)}
        />
        <DetailsCard car={c} />
        <Button
          label={premium ? 'Price check' : 'Price check (Premium)'}
          icon="pricetag-outline"
          kind="secondary"
          onPress={() =>
            premium
              ? router.push({ pathname: '/car/[id]/price', params: { id: c.id } })
              : router.push({ pathname: '/paywall', params: { placement: 'premium_feature' } })
          }
        />
        {c.verdict ? (
          <Button
            label="See the verdict"
            icon="speedometer-outline"
            kind="secondary"
            onPress={() => router.push({ pathname: '/car/[id]/verdict', params: { id: c.id } })}
          />
        ) : null}
        {report && report.coverage === 'none' ? (
          <>
            <ModelCard car={c} />
            <OtherMarketCard />
            <ListingCard
              car={c}
              priceResult={priceResult}
              premium={premium}
              onSave={(text) => update.mutate({ listingText: text })}
              onFill={(fields) => update.mutate(fields)}
            />
          </>
        ) : report ? (
          <>
            <RecallsCard recalls={report.recalls} />
            <ProblemAreasCard report={report} />
            <ModelCard car={c} />
            <SafetyCard report={report} />
            <ListingCard
              car={c}
              priceResult={priceResult}
              premium={premium}
              onSave={(text) => update.mutate({ listingText: text })}
              onFill={(fields) => update.mutate(fields)}
            />
            <AppText variant="caption" tone="muted">
              Recall, complaint and rating data: U.S. National Highway Traffic Safety Administration (NHTSA), as of{' '}
              {new Date(report.fetchedAt).toLocaleDateString('en-US')}. Not a vehicle history report. Not affiliated with NHTSA or any
              manufacturer.
            </AppText>
          </>
        ) : (
          <AppText tone="muted">No report saved yet. Pull down to load it.</AppText>
        )}
        <Button label="Remove from garage" kind="ghost" onPress={confirmDelete} />
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={[styles.cta, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        <Button
          label={c.verdict ? 'Continue the inspection' : 'Start the inspection'}
          icon="clipboard-outline"
          onPress={async () => {
            // Free tier: one inspected car (lifetime); others need Premium (CLAUDE.md §9).
            const freeId = await getMeta(getDb(), META.freeInspectionCarId);
            if (!premium && !canInspectFree(freeId, c.id)) {
              router.push({ pathname: '/paywall', params: { placement: 'second_inspection' } });
              return;
            }
            if (!freeId && !premium) await setMeta(getDb(), META.freeInspectionCarId, c.id);
            if (!c.verdict) track('inspection_started', {});
            router.push({ pathname: '/car/[id]/inspect', params: { id: c.id } });
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl },
  recall: { gap: space.sm },
  recallHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  quote: { fontStyle: 'italic', paddingLeft: space.md },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  details: { marginTop: -space.sm },
  cta: { paddingHorizontal: space.xl, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
