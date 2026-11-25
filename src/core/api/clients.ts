// The API clients the app uses, routed by the current API mode (see mode.ts).
import { directVehicleClient } from './directClients';
import { getApiMode } from './mode';
import { mockListingClient, mockPhotoCheckClient, mockQuotaClient, mockVehicleClient } from './mocks/mockClients';
import { liveListingClient, livePhotoCheckClient, liveQuotaClient, liveVehicleClient } from './liveClients';
import type { ListingClient, PhotoCheckClient, QuotaClient, VehicleClient } from './types';

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
export const quotaClient: QuotaClient = {
  getStatus: () => (live() ? liveQuotaClient : mockQuotaClient).getStatus(),
  deleteServerData: () => (live() ? liveQuotaClient : mockQuotaClient).deleteServerData(),
};
