// A vehicle report for cars outside NHTSA's coverage: the decode comes from what the user confirmed in our model
// database (or typed), and recall/complaint sections are marked "not available for this market".
import type { CarModel, Engine } from '../data/knowledgeSchema';
import type { Powertrain } from '../types';
import type { VehicleReport } from '../vehicle/types';

export function manualReport(
  input:
    | { model: CarModel; engine: Engine | null; year: number | null; vin: string | null }
    | { make: string; modelName: string; year: number | null; powertrain: Powertrain; vin: string | null },
  now: number = Date.now(),
): VehicleReport {
  const fromDb = 'model' in input;
  return {
    decode: {
      vin: input.vin,
      year: input.year,
      make: fromDb ? input.model.make : input.make,
      model: fromDb ? input.model.model : input.modelName,
      trim: fromDb ? input.model.generation : null,
      body: fromDb ? input.model.body[0] : null,
      powertrain: fromDb ? (input.engine?.fuel ?? input.model.engines[0].fuel) : input.powertrain,
      engineDesc: fromDb ? (input.engine?.name ?? null) : null,
      drive: null,
      plantCountry: null,
      decodeWarnings: [],
    },
    recalls: null,
    complaints: null,
    safety: null,
    coverage: 'none',
    fetchedAt: now,
  };
}
