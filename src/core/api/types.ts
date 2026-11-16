import type { PhotoCheckRequest, PhotoCheckResult } from '../photoCheck/types';
import type { Powertrain } from '../types';
import type { VehicleReport } from '../vehicle/types';

export type ApiErrorCode = 'network' | 'timeout' | 'not_found' | 'quota_exceeded' | 'invalid_response' | 'not_configured' | 'server';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type VehicleLookup = { vin: string } | { year: number; make: string; model: string; powertrainHint?: Powertrain };

export interface ListingFields {
  price: number | null;
  mileage: number | null;
  year: number | null;
  make: string | null;
  model: string | null;
  title_status_words: string[];
  seller_location_text: string | null;
}

export interface ListingExtraction {
  extracted_text: string;
  fields: ListingFields;
}

export interface QuotaStatus {
  premium: boolean;
  /** Epoch ms when the 30-day pass ends, if the user has one. */
  passExpiresAt: number | null;
  freeInspectionUsed: boolean;
  photoChecksLeft: number;
}

export interface VehicleClient {
  getReport(lookup: VehicleLookup): Promise<VehicleReport>;
  /** Makes with NHTSA records for a model year, as NHTSA writes them (e.g. "HONDA"). */
  listMakes(year: number): Promise<string[]>;
  /** Model names for a make/year, as NHTSA writes them (e.g. "CR-V"). */
  listModels(year: number, make: string): Promise<string[]>;
}
export interface PhotoCheckClient {
  check(req: PhotoCheckRequest): Promise<PhotoCheckResult>;
}
export interface ListingClient {
  extractListing(imageUris: string[]): Promise<ListingExtraction>;
  readVin(imageUri: string): Promise<{ vin: string | null }>;
}
export interface QuotaClient {
  getStatus(): Promise<QuotaStatus>;
}
