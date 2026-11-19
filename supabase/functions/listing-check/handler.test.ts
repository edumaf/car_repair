import { assert, assertEquals } from 'jsr:@std/assert@1';

import { cleanVin, scrubContacts, toNumber } from '../_shared/listingContract.ts';
import { allowAllQuota, type Quota } from '../_shared/quota.ts';
import { VisionError, type VisionProvider, type VisionRequest } from '../_shared/vision.ts';
import { handleListingCheck } from './handler.ts';

const JPEG = '/9j/' + 'A'.repeat(200);
const auth = () => Promise.resolve('user-1');
const quiet = () => {};
const usage = { inputTokens: 1500, outputTokens: 300, thinkingTokens: 0 };
const post = (body: unknown) => new Request('http://x/listing-check', { method: 'POST', body: JSON.stringify(body) });

function provider(outputs: (string | Error)[]): VisionProvider & { calls: VisionRequest[] } {
  const calls: VisionRequest[] = [];
  return {
    name: 'fake',
    model: 'fake-1',
    calls,
    generate(r) {
      calls.push(r);
      const o = outputs.shift();
      if (o instanceof Error) return Promise.reject(o);
      return Promise.resolve({ text: o ?? '', stopReason: 'end_turn', usage });
    },
  };
}

function gateQuota(listing: 'ok' | 'paywall' | 'daily_limit', vin: 'ok' | 'daily_limit' = 'ok'): Quota & { refunds: number } {
  const q = {
    ...allowAllQuota,
    refunds: 0,
    beginListingCheck: () =>
      Promise.resolve(
        listing === 'ok'
          ? { allowed: true as const, refund: () => ((q.refunds += 1), Promise.resolve()) }
          : { allowed: false as const, reason: listing },
      ),
    beginVinRead: () =>
      Promise.resolve(
        vin === 'ok'
          ? { allowed: true as const, refund: () => ((q.refunds += 1), Promise.resolve()) }
          : { allowed: false as const, reason: vin },
      ),
  };
  return q;
}

const listingOut = {
  extracted_text: '2013 Nissan Altima SV, 98,000 miles, clean title. Call 555-123-4567 or mail bob@example.com',
  fields: {
    price: '$7,950',
    mileage: 98000,
    year: 2013,
    make: 'Nissan',
    model: 'Altima',
    title_status_words: ['Clean Title'],
    seller_location_text: 'Dallas, TX',
  },
};

Deno.test('listing: extracts fields, normalizes numbers, scrubs contacts', async () => {
  const p = provider([JSON.stringify(listingOut)]);
  const res = await handleListingCheck(post({ mode: 'listing', images: [JPEG, JPEG] }), { provider: p, authenticate: auth, log: quiet });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.fields.price, 7950);
  assertEquals(body.fields.mileage, 98000);
  assertEquals(body.fields.title_status_words, ['clean title']);
  assert(!body.extracted_text.includes('555-123-4567'));
  assert(!body.extracted_text.includes('bob@example.com'));
  assertEquals(p.calls[0].imagesBase64Jpeg.length, 2);
  assert(p.calls[0].system.includes('never say whether the price is fair'));
});

Deno.test('vin_ocr: cleans the VIN; unreadable → null', async () => {
  const r1 = await handleListingCheck(post({ mode: 'vin_ocr', images: [JPEG] }), {
    provider: provider([JSON.stringify({ vin: '1hg fc2f5 9ja012345' })]),
    authenticate: auth,
    log: quiet,
  });
  assertEquals(await r1.json(), { vin: '1HGFC2F59JA012345'.slice(0, 17) });
  const r2 = await handleListingCheck(post({ mode: 'vin_ocr', images: [JPEG] }), {
    provider: provider([JSON.stringify({ vin: 'ABC' })]),
    authenticate: auth,
    log: quiet,
  });
  assertEquals(await r2.json(), { vin: null });
});

Deno.test('quota: listing screenshots are Premium (402), VIN reads have a daily cap (429)', async () => {
  const deps = (q: Quota) => ({ provider: provider([]), authenticate: auth, quota: q, log: quiet });
  assertEquals((await handleListingCheck(post({ mode: 'listing', images: [JPEG] }), deps(gateQuota('paywall')))).status, 402);
  assertEquals((await handleListingCheck(post({ mode: 'listing', images: [JPEG] }), deps(gateQuota('daily_limit')))).status, 429);
  assertEquals((await handleListingCheck(post({ mode: 'vin_ocr', images: [JPEG] }), deps(gateQuota('ok', 'daily_limit')))).status, 429);
});

Deno.test('retry then 502 refunds; model error refunds; bad input rejected', async () => {
  const q = gateQuota('ok');
  const p = provider(['nope', 'still nope']);
  assertEquals(
    (await handleListingCheck(post({ mode: 'listing', images: [JPEG] }), { provider: p, authenticate: auth, quota: q, log: quiet })).status,
    502,
  );
  assert(p.calls[1].retry?.errors);
  const r = await handleListingCheck(post({ mode: 'vin_ocr', images: [JPEG] }), {
    provider: provider([new VisionError(504, 'slow')]),
    authenticate: auth,
    quota: q,
    log: quiet,
  });
  assertEquals(r.status, 504);
  assertEquals(q.refunds, 2);
  const d = { provider: provider([]), authenticate: auth, log: quiet };
  assertEquals((await handleListingCheck(post({ mode: 'listing', images: [] }), d)).status, 400);
  assertEquals((await handleListingCheck(post({ mode: 'listing', images: [JPEG, JPEG, JPEG, JPEG] }), d)).status, 400);
  assertEquals((await handleListingCheck(post({ mode: 'vin_ocr', images: [JPEG, JPEG] }), d)).status, 400);
  assertEquals((await handleListingCheck(post({ mode: 'other', images: [JPEG] }), d)).status, 400);
  assertEquals(
    (await handleListingCheck(post({ mode: 'listing', images: [JPEG] }), { ...d, authenticate: () => Promise.resolve(null) })).status,
    401,
  );
});

Deno.test('helpers', () => {
  assertEquals(toNumber('12 500 €'), 12500);
  assertEquals(toNumber('call'), null);
  assertEquals(toNumber(-5), null);
  assertEquals(cleanVin('wvwzzz1kz9w?12345'), 'WVWZZZ1KZ9W?12345');
  assertEquals(scrubContacts('tel 0722 123 456, year 2012'), 'tel [contact removed], year 2012');
});
