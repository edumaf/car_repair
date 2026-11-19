// Typed access to the knowledge files (CLAUDE.md §20): model database, OBD-II codes, symptom flows.
// Add new data/models/*.json files to MODEL_FILES (a test fails if one is missing).
import obdJson from '../../../data/obd_codes.json';
import symptomsJson from '../../../data/symptoms.json';
import asiaUs from '../../../data/models/asia_us.json';
import fordGerman from '../../../data/models/ford_german.json';
import frenchOpel from '../../../data/models/french_opel.json';
import vwGroup from '../../../data/models/vw_group.json';
import type { CarModel, ModelsFile, ObdCode, ObdFile, Symptom, SymptomsFile } from './knowledgeSchema';

/** File name (without .json) → contents. Keep in sync with data/models/. */
export const MODEL_FILES: Record<string, unknown> = {
  vw_group: vwGroup,
  french_opel: frenchOpel,
  ford_german: fordGerman,
  asia_us: asiaUs,
};

const modelFiles = Object.values(MODEL_FILES) as ModelsFile[];

export const rawKnowledge = {
  models: { _meta: { version: 1, note: 'merged' }, models: modelFiles.flatMap((f) => f.models) } as unknown,
  obd: obdJson as unknown,
  symptoms: symptomsJson as unknown,
};

export const MODELS: readonly CarModel[] = modelFiles.flatMap((f) => f.models);
export const OBD_CODES: readonly ObdCode[] = (obdJson as unknown as ObdFile).codes;
export const SYMPTOMS: readonly Symptom[] = (symptomsJson as unknown as SymptomsFile).symptoms;

const modelsById = new Map(MODELS.map((m) => [m.id, m]));
const codesById = new Map(OBD_CODES.map((c) => [c.code, c]));
const symptomsById = new Map(SYMPTOMS.map((s) => [s.id, s]));

export const getModel = (id: string) => modelsById.get(id);
export const getObdCode = (code: string) => codesById.get(code.trim().toUpperCase());
export const getSymptom = (id: string) => symptomsById.get(id);
