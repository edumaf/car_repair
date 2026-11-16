// Mock API clients for Expo Go and tests (EXPO_PUBLIC_USE_MOCKS=1, CLAUDE.md §4).
// Vehicle reports are real NHTSA data recorded by `npm run fixtures`; photo/listing results are canned.
import type { PhotoCheckRequest, PhotoCheckResult } from '../../photoCheck/types';
import type { VehicleReport } from '../../vehicle/types';
import { normalizeVin } from '../../vin/vin';
import { MOCK_LATENCY_MS } from '../config';
import { ApiError, type ListingClient, type PhotoCheckClient, type QuotaClient, type VehicleClient, type VehicleLookup } from '../types';
import altima from './fixtures/altima_2013.json';
import civic from './fixtures/civic_2018.json';
import f150 from './fixtures/f150_2015.json';
import index from './fixtures/index.json';
import jetta from './fixtures/jetta_tdi_2012.json';
import model3 from './fixtures/model3_2019.json';
import prius from './fixtures/prius_2017.json';

export const FIXTURE_REPORTS: Record<string, VehicleReport> = {
  civic_2018: civic as VehicleReport,
  f150_2015: f150 as VehicleReport,
  altima_2013: altima as VehicleReport,
  prius_2017: prius as VehicleReport,
  model3_2019: model3 as VehicleReport,
  jetta_tdi_2012: jetta as VehicleReport,
};

/** The sample cars (with their synthetic VINs) available in mock mode. */
export const FIXTURE_CARS = index;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => delay(process.env.NODE_ENV === 'test' ? 0 : MOCK_LATENCY_MS);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function findFixture(lookup: VehicleLookup): VehicleReport | null {
  const match =
    'vin' in lookup
      ? index.find((c) => c.vin === normalizeVin(lookup.vin))
      : index.find((c) => c.year === lookup.year && norm(c.make) === norm(lookup.make) && norm(c.model) === norm(lookup.model));
  return match ? FIXTURE_REPORTS[match.id] : null;
}

export const mockVehicleClient: VehicleClient = {
  async getReport(lookup) {
    await latency();
    const report = findFixture(lookup);
    if (!report) {
      throw new ApiError('not_found', 'Mock mode only knows the sample cars. Try one of their VINs, or turn mocks off.');
    }
    return { ...report, fetchedAt: Date.now() };
  },
  async listMakes(year) {
    await latency();
    return [...new Set(index.filter((c) => c.year === year).map((c) => c.make.toUpperCase()))].sort();
  },
  async listModels(year, make) {
    await latency();
    return index.filter((c) => c.year === year && norm(c.make) === norm(make)).map((c) => c.model.toUpperCase());
  },
};

const CANNED: Partial<Record<PhotoCheckRequest['photoType'], Partial<PhotoCheckResult>>> = {
  tire: {
    findings: [
      { code: 'uneven_wear_inner', confidence: 'medium', description: 'The inner edge of the tread looks more worn than the outer edge.' },
    ],
    transcriptions: { dot_code: '4519' },
  },
  dashboard_lights: { lights: ['check_engine', 'tpms'], transcriptions: { odometer_value: 84213, odometer_unit: 'mi' } },
  rust: {
    findings: [
      { code: 'bubbling_paint', confidence: 'high', description: 'Paint is bubbling along the lower edge of the rear wheel arch.' },
    ],
  },
  vin_plate: { transcriptions: { vin_text: '2HGFC2F78JH900001' } },
  odometer: { transcriptions: { odometer_value: 84213, odometer_unit: 'mi' } },
};

export const mockPhotoCheckClient: PhotoCheckClient = {
  async check(req) {
    await latency();
    const canned = CANNED[req.photoType] ?? {};
    return {
      quality: { ok: true, retake_tip: null },
      findings: [],
      lights: [],
      transcriptions: {},
      notes_for_user: 'Sample result: real AI photo checks need the backend.',
      ...canned,
    };
  },
};

export const mockListingClient: ListingClient = {
  async extractListing() {
    await latency();
    return {
      extracted_text:
        '2013 Nissan Altima 2.5 S. 112k miles. Runs great, minor CVT shudder. Clean title in hand. $4,900 OBO. Cash only, no test drives without deposit.',
      fields: {
        price: 4900,
        mileage: 112000,
        year: 2013,
        make: 'Nissan',
        model: 'Altima',
        title_status_words: ['clean title'],
        seller_location_text: null,
      },
    };
  },
  async readVin() {
    await latency();
    return { vin: '1N4AL3AP4DC900001' };
  },
};

export const mockQuotaClient: QuotaClient = {
  async getStatus() {
    await latency();
    return { premium: false, passExpiresAt: null, freeInspectionUsed: false, photoChecksLeft: 10 };
  },
  async deleteServerData() {
    await latency();
  },
};
