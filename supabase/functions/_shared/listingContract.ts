// /listing-check contract (CLAUDE.md §7.3). Two modes:
//   listing: 1–3 listing screenshots → { extracted_text, fields }   (Premium; the app then runs its own flag matching)
//   vin_ocr: 1 photo of a VIN plate/sticker → { vin }               (free, daily cap)
// The model only transcribes. It must not judge the seller, the car or the price.
import { z } from 'zod';

export const listingRequestSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('listing'), images: z.array(z.string().min(100)).min(1).max(3), local_day: z.string().max(10).optional() }),
  z.object({ mode: z.literal('vin_ocr'), images: z.array(z.string().min(100)).length(1), local_day: z.string().max(10).optional() }),
]);
export type ListingRequest = z.infer<typeof listingRequestSchema>;

export const LISTING_SYSTEM_PROMPT = `You read screenshots of used-car listings for a car-buying app. You TRANSCRIBE; you do not judge.
Rules:
- extracted_text: the listing's title, description and visible details, in reading order, as written (keep the original language). Max 4000 characters. Leave out names, phone numbers, emails and street addresses: write [contact removed] instead.
- fields: copy values only if they are written in the listing. price = the asking price as a plain number (no currency symbol); mileage = the odometer value as a plain number; year/make/model as written. title_status_words = words about the title or registration status that appear (e.g. "salvage", "rebuilt", "clean title"). seller_location_text = city/region only, never a street address. Use null when a value isn't shown.
- Never estimate a price, never say whether the price is fair, never comment on the seller, never say whether the car is good or safe.
- Output ONLY JSON matching the schema.`;

export const VIN_SYSTEM_PROMPT = `You read a Vehicle Identification Number (VIN) from ONE photo of a VIN plate, door-jamb sticker, windshield tag or registration document.
Rules:
- A VIN has 17 characters: digits and capital letters, never I, O or Q.
- Transcribe exactly what you see. If you are unsure of a character, write "?" in its place. If no VIN is readable, return null.
- Output ONLY JSON matching the schema.`;

const nullable = (type: string) => ({ type: [type, 'null'] });
export const LISTING_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['extracted_text', 'fields'],
  properties: {
    extracted_text: { type: 'string' },
    fields: {
      type: 'object',
      additionalProperties: false,
      required: ['price', 'mileage', 'year', 'make', 'model', 'title_status_words', 'seller_location_text'],
      properties: {
        price: nullable('number'),
        mileage: nullable('number'),
        year: nullable('integer'),
        make: nullable('string'),
        model: nullable('string'),
        title_status_words: { type: 'array', items: { type: 'string' } },
        seller_location_text: nullable('string'),
      },
    },
  },
} as const;

export const VIN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['vin'],
  properties: { vin: nullable('string') },
} as const;

const num = z.union([z.number(), z.string()]).nullable().optional();
const listingOutputSchema = z.object({
  extracted_text: z.string(),
  fields: z.object({
    price: num,
    mileage: num,
    year: num,
    make: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    title_status_words: z.array(z.string()).optional(),
    seller_location_text: z.string().nullable().optional(),
  }),
});
const vinOutputSchema = z.object({ vin: z.string().nullable() });

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string };

function parseWith<T>(schema: z.ZodType<T>, text: string): Parsed<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, errors: 'Output was not valid JSON.' };
  }
  const r = schema.safeParse(raw);
  return r.success
    ? { ok: true, value: r.data }
    : { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n') };
}

export const parseListingText = (text: string) => parseWith(listingOutputSchema, text);
export const parseVinText = (text: string) => parseWith(vinOutputSchema, text);

export type ListingResponse = {
  extracted_text: string;
  fields: {
    price: number | null;
    mileage: number | null;
    year: number | null;
    make: string | null;
    model: string | null;
    title_status_words: string[];
    seller_location_text: string | null;
  };
};

/** "12,500" / "$12 500" / 12500 → 12500; junk → null. */
export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null;
  if (typeof v !== 'string') return null;
  const digits = v.replace(/[^\d.]/g, '');
  const n = digits ? Number(digits) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Belt and braces for §2.7: strip phone numbers and emails even if the model forgot to.
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
export function scrubContacts(text: string): string {
  return text.replace(EMAIL_RE, '[contact removed]').replace(PHONE_RE, (m) => (m.replace(/\D/g, '').length >= 9 ? '[contact removed]' : m));
}

const clip = (s: string | null | undefined, max: number) => (s ? s.trim().slice(0, max) || null : null);

export function postProcessListing(out: z.infer<typeof listingOutputSchema>): ListingResponse {
  const year = toNumber(out.fields.year);
  const thisYear = new Date().getUTCFullYear();
  return {
    extracted_text: scrubContacts(out.extracted_text).slice(0, 4000),
    fields: {
      price: toNumber(out.fields.price),
      mileage: toNumber(out.fields.mileage),
      year: year !== null && Number.isInteger(year) && year >= 1950 && year <= thisYear + 1 ? year : null,
      make: clip(out.fields.make, 40),
      model: clip(out.fields.model, 60),
      title_status_words: (out.fields.title_status_words ?? [])
        .map((w) => w.trim().toLowerCase().slice(0, 40))
        .filter(Boolean)
        .slice(0, 10),
      seller_location_text: clip(out.fields.seller_location_text ? scrubContacts(out.fields.seller_location_text) : null, 80),
    },
  };
}

/** Uppercases, drops spaces/dashes; keeps "?" for unreadable characters. Null unless it looks like a VIN. */
export function cleanVin(v: string | null): string | null {
  if (!v) return null;
  const s = v.toUpperCase().replace(/[^A-Z0-9?]/g, '');
  return s.length === 17 ? s : null;
}
