// Cars the user is checking (the `cars` table). The vehicle report is stored with the car so it works offline.
import type { Car, CarStatus, MileageUnit, Powertrain, SellerType } from '@/core/types';
import type { VehicleReport } from '@/core/vehicle/types';

import { newId } from './ids';
import type { SqlDb } from './sqlDb';

interface CarRow {
  id: string;
  created_at: number;
  updated_at: number;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body: string | null;
  powertrain: Powertrain;
  engine_desc: string | null;
  drive: string | null;
  asking_price: number | null;
  mileage: number | null;
  mileage_unit: MileageUnit;
  seller_type: SellerType;
  listing_text: string | null;
  nickname: string | null;
  status: CarStatus;
  vehicle_report_json: string | null;
  verdict: string | null;
  verdict_json: string | null;
  model_id: string | null;
  engine_id: string | null;
}

export interface CarRecord extends Car {
  report: VehicleReport | null;
  verdict: string | null;
  verdictJson: string | null;
}

const fromRow = (r: CarRow): CarRecord => ({
  id: r.id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  vin: r.vin,
  year: r.year,
  make: r.make,
  model: r.model,
  trim: r.trim,
  body: r.body,
  powertrain: r.powertrain,
  engineDesc: r.engine_desc,
  drive: r.drive,
  askingPrice: r.asking_price,
  mileage: r.mileage,
  mileageUnit: r.mileage_unit ?? 'mi',
  sellerType: r.seller_type,
  listingText: r.listing_text,
  nickname: r.nickname,
  status: r.status,
  modelId: r.model_id,
  engineId: r.engine_id,
  report: r.vehicle_report_json ? (JSON.parse(r.vehicle_report_json) as VehicleReport) : null,
  verdict: r.verdict,
  verdictJson: r.verdict_json,
});

export interface NewCar {
  report: VehicleReport;
  askingPrice?: number | null;
  mileage?: number | null;
  sellerType?: SellerType;
  /** Overrides the decoded powertrain (e.g. the user picked "hybrid" for a year/make/model car). */
  powertrain?: Powertrain;
  mileageUnit?: MileageUnit;
  modelId?: string | null;
  engineId?: string | null;
}

export async function createCar(db: SqlDb, input: NewCar, now = Date.now()): Promise<string> {
  const id = newId();
  const d = input.report.decode;
  await db.runAsync(
    `INSERT INTO cars (id, created_at, updated_at, vin, year, make, model, trim, body, powertrain, engine_desc, drive,
       asking_price, mileage, seller_type, status, vehicle_report_json, mileage_unit, model_id, engine_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'considering', ?, ?, ?, ?)`,
    id,
    now,
    now,
    d.vin,
    d.year,
    d.make,
    d.model,
    d.trim,
    d.body,
    input.powertrain ?? d.powertrain,
    d.engineDesc,
    d.drive,
    input.askingPrice ?? null,
    input.mileage ?? null,
    input.sellerType ?? 'unknown',
    JSON.stringify(input.report),
    input.mileageUnit ?? 'mi',
    input.modelId ?? null,
    input.engineId ?? null,
  );
  return id;
}

export async function getCar(db: SqlDb, id: string): Promise<CarRecord | null> {
  const row = await db.getFirstAsync<CarRow>('SELECT * FROM cars WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

export async function listCars(db: SqlDb, status?: CarStatus): Promise<CarRecord[]> {
  const rows = status
    ? await db.getAllAsync<CarRow>('SELECT * FROM cars WHERE status = ? ORDER BY updated_at DESC', status)
    : await db.getAllAsync<CarRow>('SELECT * FROM cars ORDER BY updated_at DESC');
  return rows.map(fromRow);
}

export interface CarPatch {
  askingPrice?: number | null;
  mileage?: number | null;
  sellerType?: SellerType;
  listingText?: string | null;
  nickname?: string | null;
  status?: CarStatus;
  powertrain?: Powertrain;
  report?: VehicleReport;
  verdict?: string | null;
  verdictJson?: string | null;
  modelId?: string | null;
  engineId?: string | null;
  mileageUnit?: MileageUnit;
}

const COLUMNS: Record<keyof CarPatch, string> = {
  askingPrice: 'asking_price',
  mileage: 'mileage',
  sellerType: 'seller_type',
  listingText: 'listing_text',
  nickname: 'nickname',
  status: 'status',
  powertrain: 'powertrain',
  report: 'vehicle_report_json',
  verdict: 'verdict',
  verdictJson: 'verdict_json',
  modelId: 'model_id',
  engineId: 'engine_id',
  mileageUnit: 'mileage_unit',
};

export async function updateCar(db: SqlDb, id: string, patch: CarPatch, now = Date.now()): Promise<void> {
  const keys = (Object.keys(patch) as (keyof CarPatch)[]).filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return;
  const values = keys.map((k) => (k === 'report' ? JSON.stringify(patch.report) : (patch[k] as string | number | null)));
  await db.runAsync(`UPDATE cars SET ${keys.map((k) => `${COLUMNS[k]} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...values, now, id);
}

export async function deleteCar(db: SqlDb, id: string): Promise<void> {
  await db.runAsync('DELETE FROM cars WHERE id = ?', id);
}

/** "2018 Honda Civic EX" (or the nickname). */
export function carTitle(car: Pick<Car, 'year' | 'make' | 'model'> & { nickname?: string | null }): string {
  if (car.nickname) return car.nickname;
  return [car.year, car.make, car.model].filter(Boolean).join(' ') || 'Unknown car';
}
