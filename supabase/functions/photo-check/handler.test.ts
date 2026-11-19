import { assert, assertEquals } from 'jsr:@std/assert@1';

import { allowAllQuota, type Quota } from '../_shared/quota.ts';
import { VisionError, type VisionProvider, type VisionRequest } from '../_shared/vision.ts';
import { handlePhotoCheck } from './handler.ts';

const JPEG = '/9j/' + 'A'.repeat(200);
const auth = () => Promise.resolve('user-1');
const quiet = () => {};
const usage = { inputTokens: 1000, outputTokens: 200, thinkingTokens: 0 };
const post = (body: unknown) => new Request('http://x/photo-check', { method: 'POST', body: JSON.stringify(body) });
const req = (photo_type = 'tire') => ({ image: JPEG, photo_type, car: { year: 2018, make: 'Honda', model: 'Civic', powertrain: 'gas' } });

const good = {
  quality: { ok: true, retake_tip: null },
  findings: [
    { code: 'tread_low', confidence: 'high', description: 'Front left tread is near the wear bars.' },
    { code: 'perforation', confidence: 'high', description: 'not a tire finding' },
  ],
  lights: ['check_engine'],
  transcriptions: { vin_text: null, odometer_value: null, odometer_unit: null, dot_code: 'DOT 4519', title_brand_words: [] },
  notes_for_user: 'Tread looks low.',
};

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

function countingQuota(allowed = true, reason: 'paywall' | 'daily_limit' = 'paywall'): Quota & { refunds: number } {
  const q = {
    ...allowAllQuota,
    refunds: 0,
    beginPhotoCheck: () =>
      Promise.resolve(
        allowed ? { allowed: true as const, refund: () => ((q.refunds += 1), Promise.resolve()) } : { allowed: false as const, reason },
      ),
  };
  return q;
}

Deno.test('valid photo → filtered findings, no lights for a tire photo, DOT code digits', async () => {
  const p = provider([JSON.stringify(good)]);
  const res = await handlePhotoCheck(post(req('tire')), { provider: p, authenticate: auth, log: quiet });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(
    body.findings.map((f: { code: string }) => f.code),
    ['tread_low'],
  );
  assertEquals(body.lights, []);
  assertEquals(body.transcriptions.dot_code, '4519');
  assert(p.calls[0].userText.includes('ALLOWED_FINDINGS: tread_low'));
  assert(p.calls[0].system.includes('Never estimate repair costs'));
});

Deno.test('retries once with validation errors, then 502 and refunds', async () => {
  const q = countingQuota();
  const p = provider(['not json', '{"also": "bad"}']);
  const res = await handlePhotoCheck(post(req()), { provider: p, authenticate: auth, quota: q, log: quiet });
  assertEquals(res.status, 502);
  assertEquals(p.calls.length, 2);
  assert(p.calls[1].retry?.errors);
  assertEquals(q.refunds, 1);
});

Deno.test('unusable photo is refunded; model timeout → 504 and refunded', async () => {
  const q = countingQuota();
  const blurry = { ...good, quality: { ok: false, retake_tip: 'Too dark' }, findings: [] };
  const r1 = await handlePhotoCheck(post(req()), {
    provider: provider([JSON.stringify(blurry)]),
    authenticate: auth,
    quota: q,
    log: quiet,
  });
  assertEquals((await r1.json()).quality, { ok: false, retake_tip: 'Too dark' });
  const r2 = await handlePhotoCheck(post(req()), {
    provider: provider([new VisionError(504, 'slow')]),
    authenticate: auth,
    quota: q,
    log: quiet,
  });
  assertEquals(r2.status, 504);
  assertEquals(q.refunds, 2);
});

Deno.test('quota: free limit → 402 paywall, premium fair use → 429', async () => {
  assertEquals(
    (
      await handlePhotoCheck(post(req()), {
        provider: provider([]),
        authenticate: auth,
        quota: countingQuota(false, 'paywall'),
        log: quiet,
      })
    ).status,
    402,
  );
  assertEquals(
    (
      await handlePhotoCheck(post(req()), {
        provider: provider([]),
        authenticate: auth,
        quota: countingQuota(false, 'daily_limit'),
        log: quiet,
      })
    ).status,
    429,
  );
});

Deno.test('dashboard lights are kept only from the allowed list; bad input rejected', async () => {
  const dash = {
    ...good,
    findings: [],
    lights: ['check_engine', 'disco', 'oil_pressure'],
    transcriptions: { ...good.transcriptions, odometer_value: 84213, odometer_unit: 'mi' },
  };
  const res = await handlePhotoCheck(post(req('dashboard_lights')), {
    provider: provider([JSON.stringify(dash)]),
    authenticate: auth,
    log: quiet,
  });
  const body = await res.json();
  assertEquals(body.lights, ['check_engine', 'oil_pressure']);
  assertEquals(body.transcriptions.odometer_value, 84213);
  assertEquals(
    (
      await handlePhotoCheck(post({ ...req(), image: 'iVBOR' + 'A'.repeat(200) }), {
        provider: provider([]),
        authenticate: auth,
        log: quiet,
      })
    ).status,
    400,
  );
  assertEquals(
    (await handlePhotoCheck(post({ ...req(), photo_type: 'selfie' }), { provider: provider([]), authenticate: auth, log: quiet })).status,
    400,
  );
  assertEquals((await handlePhotoCheck(post(req()), { provider: null, authenticate: auth, log: quiet })).status, 500);
});
