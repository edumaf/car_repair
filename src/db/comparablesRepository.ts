// Comparable listings the user entered for a car (the `comparables` table, CLAUDE.md §6.7).
import { newId } from './ids';
import type { SqlDb } from './sqlDb';

export interface ComparableRecord {
  id: string;
  price: number;
  mileage: number | null;
  year: number | null;
  note: string | null;
}

export async function listComparables(db: SqlDb, carId: string): Promise<ComparableRecord[]> {
  const rows = await db.getAllAsync<{ id: string; price: number; mileage: number | null; year: number | null; source_note: string | null }>(
    'SELECT id, price, mileage, year, source_note FROM comparables WHERE car_id = ? ORDER BY rowid',
    carId,
  );
  return rows.map((r) => ({ id: r.id, price: r.price, mileage: r.mileage, year: r.year, note: r.source_note }));
}

export async function addComparable(db: SqlDb, carId: string, c: Omit<ComparableRecord, 'id'>): Promise<string> {
  const id = newId();
  await db.runAsync(
    'INSERT INTO comparables (id, car_id, price, mileage, year, source_note) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    carId,
    c.price,
    c.mileage,
    c.year,
    c.note,
  );
  return id;
}

export async function deleteComparable(db: SqlDb, id: string): Promise<void> {
  await db.runAsync('DELETE FROM comparables WHERE id = ?', id);
}
