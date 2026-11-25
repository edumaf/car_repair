// /photo-check contract (CLAUDE.md §7.2): request schema, prompts, response JSON schema, validation, post-processing.
import { z } from 'zod';

import { ALLOWED_FINDINGS, ALLOWED_LIGHTS, TITLE_BRAND_WORDS, type PhotoCheckResult } from './core/photoCheck/types.ts';
import { PHOTO_CHECK_TYPES } from './core/types.ts';

export const photoCheckRequestSchema = z.object({
  image: z.string().min(100),
  photo_type: z.enum(PHOTO_CHECK_TYPES),
  car: z.object({
    year: z.number().int().nullable(),
    make: z.string().max(60).nullable(),
    model: z.string().max(80).nullable(),
    powertrain: z.string().max(10),
  }),
  local_day: z.string().max(10).optional(),
});
export type PhotoCheckRequest = z.infer<typeof photoCheckRequestSchema>;

export const PHOTO_SYSTEM_PROMPT = `You are the photo-inspection helper in a used-car buying app. You see ONE photo a buyer took while inspecting a used car, and the type of photo they intended (PHOTO_TYPE).
Rules:
- Describe only what is clearly visible. Do not guess hidden conditions, history or causes.
- Report findings only from ALLOWED_FINDINGS for this PHOTO_TYPE, each with confidence "high"|"medium"|"low" and a short plain-English description (max 140 chars) of where you see it.
- If the photo is unusable (blurry, dark, wrong subject), set quality.ok=false and give one short retake tip.
- For dashboard photos, list every illuminated warning light you can identify from ALLOWED_LIGHTS, and read the odometer if visible.
- For VIN/odometer/document photos, transcribe the requested text exactly; if unsure of a character, use "?".
- Never estimate repair costs, prices, or whether the car is safe. Never mention brands of parts.
- Output ONLY JSON matching the schema.`;

export function buildPhotoUserPrompt(req: PhotoCheckRequest): string {
  const car = [req.car.year, req.car.make, req.car.model].filter(Boolean).join(' ') || 'unknown car';
  const lines = [
    `PHOTO_TYPE: ${req.photo_type}`,
    `CAR: ${car} (${req.car.powertrain})`,
    `ALLOWED_FINDINGS: ${ALLOWED_FINDINGS[req.photo_type].join(', ') || '(none: transcription only)'}`,
  ];
  if (req.photo_type === 'dashboard_lights') lines.push(`ALLOWED_LIGHTS: ${ALLOWED_LIGHTS.join(', ')}`);
  if (req.photo_type === 'document')
    lines.push(
      `TITLE_BRAND_WORDS to look for: ${TITLE_BRAND_WORDS.join(', ')}. Report only which of these words appear; never return names.`,
    );
  if (req.photo_type === 'tire') lines.push('If a DOT date code is readable, put its last 4 digits in transcriptions.dot_code.');
  if (req.photo_type === 'vin_plate') lines.push('Transcribe the 17-character VIN into transcriptions.vin_text.');
  if (req.photo_type === 'odometer' || req.photo_type === 'dashboard_lights')
    lines.push('If the odometer is readable, give odometer_value and odometer_unit.');
  return lines.join('\n');
}

const nullableString = { type: ['string', 'null'] };
export const PHOTO_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['quality', 'findings', 'lights', 'transcriptions', 'notes_for_user'],
  properties: {
    quality: {
      type: 'object',
      additionalProperties: false,
      required: ['ok', 'retake_tip'],
      properties: { ok: { type: 'boolean' }, retake_tip: nullableString },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'confidence', 'description'],
        properties: { code: { type: 'string' }, confidence: { enum: ['high', 'medium', 'low'] }, description: { type: 'string' } },
      },
    },
    lights: { type: 'array', items: { type: 'string' } },
    transcriptions: {
      type: 'object',
      additionalProperties: false,
      required: ['vin_text', 'odometer_value', 'odometer_unit', 'dot_code', 'title_brand_words'],
      properties: {
        vin_text: nullableString,
        odometer_value: { type: ['number', 'null'] },
        odometer_unit: { enum: ['mi', 'km', null] },
        dot_code: nullableString,
        title_brand_words: { type: 'array', items: { type: 'string' } },
      },
    },
    notes_for_user: { type: 'string' },
  },
} as const;

const modelOutputSchema = z.object({
  quality: z.object({ ok: z.boolean(), retake_tip: z.string().nullable() }),
  findings: z.array(z.object({ code: z.string(), confidence: z.enum(['high', 'medium', 'low']), description: z.string() })),
  lights: z.array(z.string()),
  transcriptions: z.object({
    vin_text: z.string().nullable().optional(),
    odometer_value: z.number().nullable().optional(),
    odometer_unit: z.enum(['mi', 'km']).nullable().optional(),
    dot_code: z.string().nullable().optional(),
    title_brand_words: z.array(z.string()).optional(),
  }),
  notes_for_user: z.string(),
});

export function parsePhotoText(text: string): { ok: true; value: z.infer<typeof modelOutputSchema> } | { ok: false; errors: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, errors: 'Output was not valid JSON.' };
  }
  const r = modelOutputSchema.safeParse(raw);
  return r.success
    ? { ok: true, value: r.data }
    : { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n') };
}

/** Drops codes not allowed for the photo type, unknown lights and title words, and clips text (§7.2). */
export function postProcessPhoto(out: z.infer<typeof modelOutputSchema>, photoType: PhotoCheckRequest['photo_type']): PhotoCheckResult {
  const allowed = new Set(ALLOWED_FINDINGS[photoType]);
  const lights = new Set<string>(ALLOWED_LIGHTS);
  const brands = new Set<string>(TITLE_BRAND_WORDS);
  const seen = new Set<string>();
  return {
    quality: {
      ok: out.quality.ok,
      retake_tip: out.quality.ok ? null : (out.quality.retake_tip ?? '').slice(0, 140) || 'Try again with more light, closer.',
    },
    findings: out.findings
      .filter((f) => allowed.has(f.code) && !seen.has(f.code) && seen.add(f.code))
      .map((f) => ({ ...f, description: f.description.slice(0, 140) })),
    lights: photoType === 'dashboard_lights' ? ([...new Set(out.lights)].filter((l) => lights.has(l)) as PhotoCheckResult['lights']) : [],
    transcriptions: {
      vin_text: out.transcriptions.vin_text
        ? out.transcriptions.vin_text
            .toUpperCase()
            .replace(/[^A-Z0-9?]/g, '')
            .slice(0, 17)
        : null,
      odometer_value: out.transcriptions.odometer_value ?? null,
      odometer_unit: out.transcriptions.odometer_unit ?? null,
      dot_code: out.transcriptions.dot_code ? out.transcriptions.dot_code.replace(/[^0-9]/g, '').slice(-4) || null : null,
      title_brand_words: (out.transcriptions.title_brand_words ?? []).map((w) => w.toLowerCase()).filter((w) => brands.has(w)),
    },
    notes_for_user: out.notes_for_user.slice(0, 240),
  };
}
