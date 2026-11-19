// Price check (CLAUDE.md §6.7): the user adds 2-6 similar listings; we fit price against mileage and show where this
// car sits. Never a price from the LLM. Links out to valuation / listing sites for the region (no scraping).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { listingClient } from '@/core/api/clients';
import { aiIsSample } from '@/core/api/mode';
import { FIELD_FLAGS } from '@/core/data/seed';
import { priceFarBelowSimilar } from '@/core/listing/fieldFlags';

import { formatNumber, money, type Region } from '@/core/region';
import type { PricePosition } from '@/core/types';
import { carTitle } from '@/db/carsRepository';
import { AppText } from '@/design/components/AppText';
import { FormScroll } from '@/design/components/FormScroll';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Divider } from '@/design/components/Row';
import { ErrorState, LoadingState } from '@/design/components/States';
import { Tag } from '@/design/components/Tag';
import { TextField, parseNumber } from '@/design/components/TextField';
import { space, useTheme, type SignalColor } from '@/design/tokens';
import { useUpdateCar } from '@/hooks/useCars';
import { usePriceCheck } from '@/hooks/usePriceCheck';
import { useRegion } from '@/hooks/useRegion';
import { tr } from '@/core/i18n/i18n';
import { PhotoPermissionError, deleteTempImages, pickScreenshots } from '@/media/photos';
import { track } from '@/analytics/analytics';

const POSITION: Record<PricePosition, { label: string; color: SignalColor; text: string }> = {
  below: {
    label: 'Below typical',
    color: 'go',
    text: 'Cheaper than similar cars. Good, but ask why: very cheap cars sometimes hide problems.',
  },
  within: { label: 'Within the typical range', color: 'brand', text: 'In line with similar cars you found.' },
  above: { label: 'Above typical', color: 'caution', text: 'More expensive than similar cars. Use it to negotiate.' },
  unknown: { label: 'Not enough data yet', color: 'slate', text: '' },
};

const SITES: Record<Region, { label: string; url: string }[]> = {
  us: [
    { label: 'Kelley Blue Book valuation', url: 'https://www.kbb.com/whats-my-car-worth/' },
    { label: 'Edmunds appraisal', url: 'https://www.edmunds.com/appraisal/' },
  ],
  uk: [{ label: 'Search Auto Trader', url: 'https://www.autotrader.co.uk/' }],
  ro: [
    { label: 'Search Autovit', url: 'https://www.autovit.ro/' },
    { label: 'Search OLX', url: 'https://www.olx.ro/auto-masini-moto-ambarcatiuni/' },
  ],
  eu: [{ label: 'Search mobile.de', url: 'https://www.mobile.de/' }],
  other: [],
};

export default function PriceCheckScreen() {
  const t = useTheme();
  const region = useRegion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { car, comps, add, remove, result } = usePriceCheck(id);
  const update = useUpdateCar(id);
  const [form, setForm] = useState({ price: '', mileage: '', year: '', note: '' });
  const [asking, setAsking] = useState('');
  const [reading, setReading] = useState(false);
  const compsCount = comps.data?.length;
  const lastCount = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (compsCount === undefined) return;
    if (lastCount.current !== undefined && lastCount.current !== compsCount && compsCount > 0) {
      track('price_check_done', { comps_count: compsCount, position: result?.position ?? 'unknown' });
    }
    lastCount.current = compsCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compsCount]);
  const [readFrom, setReadFrom] = useState<'ai' | 'sample' | null>(null);

  // A screenshot of a similar ad → our server reads price / mileage / year → the user checks them and adds it.
  const readScreenshot = async () => {
    let uris: string[] = [];
    try {
      uris = await pickScreenshots(1);
      if (!uris.length) return;
      setReading(true);
      const { fields } = await listingClient.extractListing(uris);
      setForm({
        price: fields.price ? String(fields.price) : '',
        mileage: fields.mileage ? String(fields.mileage) : '',
        year: fields.year ? String(fields.year) : '',
        note: [fields.make, fields.model].filter(Boolean).join(' '),
      });
      setReadFrom(aiIsSample() ? 'sample' : 'ai');
    } catch (e) {
      if (e instanceof PhotoPermissionError) Alert.alert('Permission needed', tr('{message} Turn it on in the iPhone Settings app.', { message: tr(e.message) }));
      else Alert.alert('Couldn’t read the screenshot', tr((e as Error).message));
    } finally {
      deleteTempImages(uris);
      setReading(false);
    }
  };

  if (car.isPending || comps.isPending) return <LoadingState label="Loading…" />;
  if (!car.data) return <ErrorState title="Car not found" message="It may have been removed." />;
  const c = car.data;
  const unit = c.mileageUnit;
  const price = parseNumber(form.price);

  const addComp = () => {
    if (!price) return;
    add.mutate({ price, mileage: parseNumber(form.mileage), year: parseNumber(form.year), note: form.note.trim() || null });
    setForm({ price: '', mileage: '', year: '', note: '' });
    setReadFrom(null);
  };
  const farBelow = priceFarBelowSimilar(c.askingPrice, result) ? FIELD_FLAGS.find((f) => f.when === 'price_far_below_similar') : undefined;

  const pos = POSITION[result?.position ?? 'unknown'];

  return (
    <FormScroll contentContainerStyle={styles.content}>
      <AppText variant="overline" tone="muted">
        Price check
      </AppText>
      <AppText variant="title">{carTitle(c)}</AppText>
      <AppText tone="muted">
        {[
          c.askingPrice != null ? tr('Asking {price}', { price: money(c.askingPrice, region) }) : null,
          c.mileage != null ? `${formatNumber(c.mileage)} ${unit}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Add the asking price and mileage to compare.'}
      </AppText>

      {c.askingPrice == null ? (
        <Card>
          <TextField
            label="Asking price"
            keyboardType="number-pad"
            value={asking}
            onChangeText={setAsking}
            placeholder={tr('e.g. 8500')}
          />
          <Button
            label="Save"
            kind="secondary"
            disabled={!parseNumber(asking)}
            onPress={() => update.mutate({ askingPrice: parseNumber(asking) })}
          />
        </Card>
      ) : null}

      <Card>
        <AppText variant="overline" tone="muted">
          Result
        </AppText>
        <Tag label={farBelow ? 'Far below typical' : pos.label} color={farBelow ? 'warn' : pos.color} />
        {result?.fairRange ? (
          <>
            <AppText variant="number">
              {money(result.fairRange.low, region)}–{money(result.fairRange.high, region)}
            </AppText>
            <AppText variant="label" tone="muted">
              Estimated fair range at {c.mileage != null ? formatNumber(c.mileage) : ''} {unit}, from {result.compsUsed} similar listings.
            </AppText>
            {pos.text ? <AppText variant="label">{pos.text}</AppText> : null}
          </>
        ) : result?.stats ? (
          <>
            <AppText variant="label">
              Similar listings: lowest {money(result.stats.min, region)}, middle {money(result.stats.median, region)}, highest{' '}
              {money(result.stats.max, region)}.
            </AppText>
            <AppText variant="caption" tone="muted">
              {result.note === 'need_mileage'
                ? 'Add this car’s mileage for a fair range.'
                : 'Add at least 3 listings with mileage for a fair range.'}
            </AppText>
          </>
        ) : (
          <AppText variant="label" tone="muted">
            Find 3 to 6 similar cars for sale (same model, ±1 year) and add their price and mileage below.
          </AppText>
        )}
        {farBelow ? (
          <View style={{ gap: space.xs }}>
            <Divider />
            <Tag label="Ask why it’s so cheap" color="warn" icon="alert-circle" />
            <AppText variant="label">{farBelow.explanation}</AppText>
            <AppText variant="label" tone="brand">
              {tr('Ask: {question}', { question: tr(farBelow.ask_seller) })}
            </AppText>
          </View>
        ) : null}
        <AppText variant="caption" tone="muted">
          Based only on the listings you entered. Asking prices aren’t sale prices.
        </AppText>
      </Card>

      <Card>
        <AppText variant="overline" tone="muted">
          Similar listings ({comps.data?.length ?? 0})
        </AppText>
        {(comps.data ?? []).map((x, i) => (
          <View key={x.id} style={{ gap: space.xs }}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.compRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{money(x.price, region)}</AppText>
                <AppText variant="caption" tone="muted">
                  {[x.mileage != null ? `${formatNumber(x.mileage)} ${unit}` : tr('mileage ?'), x.year, x.note]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr('Remove this listing')}
                onPress={() => remove.mutate(x.id)}
                hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={t.muted} />
              </Pressable>
            </View>
          </View>
        ))}
        <Divider />
        <Button label="Fill in from a screenshot" icon="images-outline" kind="ghost" loading={reading} onPress={readScreenshot} />
        {readFrom ? (
          <AppText variant="caption" tone={readFrom === 'sample' ? 'caution' : 'muted'}>
            {readFrom === 'sample'
              ? 'Sample numbers: reading screenshots needs our server, which isn’t switched on yet.'
              : 'Read by AI from your screenshot (then deleted). Check the numbers, then add the listing.'}
          </AppText>
        ) : null}
        <TextField
          label="Price"
          keyboardType="number-pad"
          value={form.price}
          onChangeText={(v) => setForm({ ...form, price: v })}
          placeholder={tr('e.g. 7900')}
        />
        <View style={styles.twoCols}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Mileage"
              suffix={unit}
              keyboardType="number-pad"
              value={form.mileage}
              onChangeText={(v) => setForm({ ...form, mileage: v })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Year" keyboardType="number-pad" value={form.year} onChangeText={(v) => setForm({ ...form, year: v })} />
          </View>
        </View>
        <TextField
          label="Note (optional)"
          value={form.note}
          onChangeText={(v) => setForm({ ...form, note: v })}
          placeholder={tr('Where you saw it')}
        />
        <Button label="Add listing" icon="add" kind="secondary" disabled={!price} onPress={addComp} />
      </Card>

      {SITES[region].length ? (
        <Card>
          <AppText variant="overline" tone="muted">
            Find similar cars
          </AppText>
          {SITES[region].map((s) => (
            <Button key={s.url} label={s.label} kind="ghost" icon="open-outline" onPress={() => Linking.openURL(s.url)} />
          ))}
        </Card>
      ) : null}
    </FormScroll>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  twoCols: { flexDirection: 'row', gap: space.md },
});
