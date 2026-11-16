// The API clients the app uses. Mocks until the Supabase backend is wired up (Milestone 1+).
import { USE_MOCKS } from './config';
import { mockListingClient, mockPhotoCheckClient, mockQuotaClient, mockVehicleClient } from './mocks/mockClients';
import { ApiError, type ListingClient, type PhotoCheckClient, type QuotaClient, type VehicleClient } from './types';

const notYet = (what: string) => async (): Promise<never> => {
  throw new ApiError('not_configured', `${what} needs the backend (coming in a later milestone).`);
};

// TODO(M1): real /vehicle client. TODO(M2): /photo-check. TODO(M4): /listing-check. TODO(M5): /quota.
const realVehicleClient: VehicleClient = { getReport: notYet('Vehicle reports') };
const realPhotoCheckClient: PhotoCheckClient = { check: notYet('Photo checks') };
const realListingClient: ListingClient = { extractListing: notYet('Listing screenshots'), readVin: notYet('VIN photos') };
const realQuotaClient: QuotaClient = { getStatus: notYet('Quota') };

export const vehicleClient: VehicleClient = USE_MOCKS ? mockVehicleClient : realVehicleClient;
export const photoCheckClient: PhotoCheckClient = USE_MOCKS ? mockPhotoCheckClient : realPhotoCheckClient;
export const listingClient: ListingClient = USE_MOCKS ? mockListingClient : realListingClient;
export const quotaClient: QuotaClient = USE_MOCKS ? mockQuotaClient : realQuotaClient;
