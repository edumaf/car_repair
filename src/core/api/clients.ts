// The API clients the app uses, routed by the current API mode (see mode.ts).
import { directVehicleClient } from './directClients';
import { getApiMode } from './mode';
import { mockListingClient, mockPhotoCheckClient, mockQuotaClient, mockVehicleClient } from './mocks/mockClients';
import { ApiError, type ListingClient, type PhotoCheckClient, type QuotaClient, type VehicleClient } from './types';

const notYet = (what: string) => async (): Promise<never> => {
  throw new ApiError('not_configured', `${what} needs the backend, which isn't set up yet.`);
};

// TODO(backend): real Supabase clients for /vehicle, /photo-check, /listing-check and /quota.
const liveVehicleClient: VehicleClient = {
  getReport: notYet('Vehicle reports'),
  listMakes: notYet('Make lists'),
  listModels: notYet('Model lists'),
};
const livePhotoCheckClient: PhotoCheckClient = { check: notYet('Photo checks') };
const liveListingClient: ListingClient = { extractListing: notYet('Listing screenshots'), readVin: notYet('VIN photos') };
const liveQuotaClient: QuotaClient = { getStatus: notYet('Quota') };

const pickVehicle = (): VehicleClient => ({ mock: mockVehicleClient, direct: directVehicleClient, live: liveVehicleClient })[getApiMode()];
// Without a backend there is no AI: mock and direct modes both return labelled sample results.
const live = () => getApiMode() === 'live';

export const vehicleClient: VehicleClient = {
  getReport: (l) => pickVehicle().getReport(l),
  listMakes: (y) => pickVehicle().listMakes(y),
  listModels: (y, m) => pickVehicle().listModels(y, m),
};
export const photoCheckClient: PhotoCheckClient = { check: (r) => (live() ? livePhotoCheckClient : mockPhotoCheckClient).check(r) };
export const listingClient: ListingClient = {
  extractListing: (u) => (live() ? liveListingClient : mockListingClient).extractListing(u),
  readVin: (u) => (live() ? liveListingClient : mockListingClient).readVin(u),
};
export const quotaClient: QuotaClient = { getStatus: () => (live() ? liveQuotaClient : mockQuotaClient).getStatus() };
