// Live clients: everything through our Supabase Edge Functions (CLAUDE.md §2.8, §7). Used when the backend is
// configured (EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY) and the API mode is "live".
import { File } from 'expo-file-system';
import { z } from 'zod';

import { callFunction, localDay } from './callFunction';
import type { ListingClient, PhotoCheckClient, QuotaClient, VehicleClient } from './types';
import type { PhotoCheckResult } from '../photoCheck/types';
import type { VehicleReport } from '../vehicle/types';

const VEHICLE_TIMEOUT_MS = 30_000; // NHTSA calls are 10 s each server-side, several in parallel.
const AI_TIMEOUT_MS = 25_000;

// Server output is already validated there; here we check the shape enough to not crash on a bad deploy.
const vehicleReportSchema = z
  .object({
    decode: z.object({}).passthrough(),
    recalls: z.array(z.unknown()).nullable(),
    complaints: z.object({}).passthrough().nullable(),
    safety: z.object({}).passthrough().nullable(),
    fetchedAt: z.number(),
  })
  .passthrough()
  .transform((r) => r as unknown as VehicleReport);
const makesSchema = z.object({ makes: z.array(z.string()) });
const modelsSchema = z.object({ models: z.array(z.string()) });

const photoResultSchema = z
  .object({
    quality: z.object({ ok: z.boolean(), retake_tip: z.string().nullable() }),
    findings: z.array(z.object({ code: z.string(), confidence: z.enum(['high', 'medium', 'low']), description: z.string() })),
    lights: z.array(z.string()),
    transcriptions: z.object({}).passthrough(),
    notes_for_user: z.string(),
  })
  .transform((r) => r as unknown as PhotoCheckResult);

const listingSchema = z.object({
  extracted_text: z.string(),
  fields: z.object({
    price: z.number().nullable(),
    mileage: z.number().nullable(),
    year: z.number().nullable(),
    make: z.string().nullable(),
    model: z.string().nullable(),
    title_status_words: z.array(z.string()),
    seller_location_text: z.string().nullable(),
  }),
});
const vinSchema = z.object({ vin: z.string().nullable() });
const quotaSchema = z.object({
  premium: z.boolean(),
  pass_expires_at: z.number().nullable(),
  free_photo_checks_used: z.number(),
  free_photo_checks_limit: z.number(),
});

/** Photos are already 1280 px, re-encoded JPEGs without EXIF (src/media/photos.ts). */
const readBase64 = (uri: string) => new File(uri).base64();

export const liveVehicleClient: VehicleClient = {
  getReport: (lookup) =>
    callFunction(
      'vehicle',
      'vin' in lookup
        ? { vin: lookup.vin }
        : { year: lookup.year, make: lookup.make, model: lookup.model, powertrain_hint: lookup.powertrainHint },
      vehicleReportSchema,
      VEHICLE_TIMEOUT_MS,
    ),
  listMakes: async (year) => (await callFunction('vehicle', { action: 'makes', year }, makesSchema, VEHICLE_TIMEOUT_MS)).makes,
  listModels: async (year, make) =>
    (await callFunction('vehicle', { action: 'models', year, make }, modelsSchema, VEHICLE_TIMEOUT_MS)).models,
};

export const livePhotoCheckClient: PhotoCheckClient = {
  check: async (req) =>
    callFunction(
      'photo-check',
      { image: await readBase64(req.imageUri), photo_type: req.photoType, car: req.car, local_day: localDay() },
      photoResultSchema,
      AI_TIMEOUT_MS,
    ),
};

export const liveListingClient: ListingClient = {
  extractListing: async (uris) =>
    callFunction(
      'listing-check',
      { mode: 'listing', images: await Promise.all(uris.map(readBase64)), local_day: localDay() },
      listingSchema,
      AI_TIMEOUT_MS,
    ),
  readVin: async (uri) =>
    callFunction('listing-check', { mode: 'vin_ocr', images: [await readBase64(uri)], local_day: localDay() }, vinSchema, AI_TIMEOUT_MS),
};

export const liveQuotaClient: QuotaClient = {
  getStatus: async () => {
    const s = await callFunction('quota', { action: 'status', local_day: localDay() }, quotaSchema, 15_000);
    return {
      premium: s.premium,
      passExpiresAt: s.pass_expires_at,
      freeInspectionUsed: s.free_photo_checks_used >= s.free_photo_checks_limit,
      photoChecksLeft: s.premium ? Infinity : Math.max(0, s.free_photo_checks_limit - s.free_photo_checks_used),
    };
  },
  deleteServerData: async () => {
    await callFunction('quota', { action: 'delete_data' }, z.object({ deleted: z.literal(true) }), 15_000);
  },
};
