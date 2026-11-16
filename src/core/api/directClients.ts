// Dev-only "direct" vehicle client: the phone calls NHTSA itself with the shared lookup code. See mode.ts.
import { COMPLAINT_KEYWORD_GROUPS } from '../data/seed';
import { NhtsaError, getVehicleReport, listMakes, listModels, makeHttpGet, type HttpGet } from '../vehicle/nhtsa';
import { ApiError, type VehicleClient } from './types';

let http: HttpGet | null = null;
const getHttp = () => (http ??= makeHttpGet(fetch));

function mapError(e: unknown): never {
  if (e instanceof NhtsaError) throw new ApiError(e.code, e.message);
  throw new ApiError('network', (e as Error)?.message ?? 'Network error');
}

export const directVehicleClient: VehicleClient = {
  getReport: (lookup) =>
    getVehicleReport(
      getHttp(),
      'vin' in lookup ? { vin: lookup.vin } : { ...lookup, powertrain: lookup.powertrainHint },
      COMPLAINT_KEYWORD_GROUPS,
    ).catch(mapError),
  listMakes: (year) => listMakes(getHttp(), year).catch(mapError),
  listModels: (year, make) => listModels(getHttp(), year, make).catch(mapError),
};
