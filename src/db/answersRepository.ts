// Inspection answers, notes and photos per car (`answers`), and AI photo-check results (`photo_checks`).
// Only answers the user gave (or confirmed from an AI finding) are stored as answers (CLAUDE.md §2.3).
import type { PhotoCheckResult } from '@/core/photoCheck/types';
import type { Answer } from '@/core/types';

import { newId } from './ids';
import type { SqlDb } from './sqlDb';

export interface AnswerRecord {
  itemId: string;
  /** null = a note or photo exists but the item isn't answered yet. */
  answer: Answer | null;
  /** 1 when the user set this answer by confirming an AI photo finding. */
  fromAi: boolean;
  note: string | null;
  photoUris: string[];
  updatedAt: number;
}

interface AnswerRow {
  item_id: string;
  answer: Answer | null;
  ai_suggested: number;
  note: string | null;
  photo_uris_json: string;
  updated_at: number;
}

export async function getAnswers(db: SqlDb, carId: string): Promise<Record<string, AnswerRecord>> {
  const rows = await db.getAllAsync<AnswerRow>('SELECT * FROM answers WHERE car_id = ?', carId);
  return Object.fromEntries(
    rows.map((r) => [
      r.item_id,
      {
        itemId: r.item_id,
        answer: r.answer,
        fromAi: r.ai_suggested === 1,
        note: r.note,
        photoUris: JSON.parse(r.photo_uris_json),
        updatedAt: r.updated_at,
      },
    ]),
  );
}

async function upsert(db: SqlDb, carId: string, itemId: string, patch: Partial<Omit<AnswerRecord, 'itemId' | 'updatedAt'>>, now: number) {
  const current = (await getAnswers(db, carId))[itemId];
  const next = {
    answer: patch.answer !== undefined ? patch.answer : (current?.answer ?? null),
    fromAi: patch.fromAi ?? current?.fromAi ?? false,
    note: patch.note !== undefined ? patch.note : (current?.note ?? null),
    photoUris: patch.photoUris ?? current?.photoUris ?? [],
  };
  await db.runAsync(
    `INSERT INTO answers (car_id, item_id, answer, ai_suggested, note, photo_uris_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(car_id, item_id) DO UPDATE SET answer = excluded.answer, ai_suggested = excluded.ai_suggested, note = excluded.note,
       photo_uris_json = excluded.photo_uris_json, updated_at = excluded.updated_at`,
    carId,
    itemId,
    next.answer,
    next.fromAi ? 1 : 0,
    next.note,
    JSON.stringify(next.photoUris),
    now,
  );
  await db.runAsync('UPDATE cars SET updated_at = ? WHERE id = ?', now, carId);
}

export function setAnswer(db: SqlDb, carId: string, itemId: string, answer: Answer, opts: { fromAi?: boolean } = {}, now = Date.now()) {
  return upsert(db, carId, itemId, { answer, fromAi: opts.fromAi ?? false }, now);
}

export function setNote(db: SqlDb, carId: string, itemId: string, note: string, now = Date.now()) {
  return upsert(db, carId, itemId, { note: note.trim() || null }, now);
}

/** Photos and notes can exist before the item is answered (answer stays null). */
export async function addPhoto(db: SqlDb, carId: string, itemId: string, uri: string, now = Date.now()) {
  const current = (await getAnswers(db, carId))[itemId];
  return upsert(db, carId, itemId, { photoUris: [...(current?.photoUris ?? []), uri] }, now);
}

export async function removePhoto(db: SqlDb, carId: string, itemId: string, uri: string, now = Date.now()) {
  const current = (await getAnswers(db, carId))[itemId];
  if (!current) return;
  await upsert(db, carId, itemId, { photoUris: current.photoUris.filter((u) => u !== uri) }, now);
  await db.runAsync('DELETE FROM photo_checks WHERE car_id = ? AND item_id = ? AND photo_uri = ?', carId, itemId, uri);
}

/** Un-answers an item, keeping its note and photos. */
export function clearAnswer(db: SqlDb, carId: string, itemId: string, now = Date.now()) {
  return upsert(db, carId, itemId, { answer: null, fromAi: false }, now);
}

/** The answers that count (CLAUDE.md §2.3, §8): item id → answer, unanswered items left out. */
/** Every car's answered items and when its inspection last changed (garage progress and "continue" button). */
export async function answerSummaries(
  db: SqlDb,
): Promise<Record<string, { answers: Record<string, Answer>; lastAt: number }>> {
  const rows = await db.getAllAsync<{ car_id: string; item_id: string; answer: Answer; updated_at: number }>(
    'SELECT car_id, item_id, answer, updated_at FROM answers WHERE answer IS NOT NULL',
  );
  const out: Record<string, { answers: Record<string, Answer>; lastAt: number }> = {};
  for (const r of rows) {
    const s = (out[r.car_id] ??= { answers: {}, lastAt: 0 });
    s.answers[r.item_id] = r.answer;
    s.lastAt = Math.max(s.lastAt, r.updated_at);
  }
  return out;
}

export function confirmedAnswers(records: Record<string, AnswerRecord>): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  for (const r of Object.values(records)) if (r.answer) out[r.itemId] = r.answer;
  return out;
}

// ---------- Photo checks ----------

/** "confirmed"/"dismissed" per finding code, or per `light:<name>` for dashboard light suggestions. */
export type Decisions = Record<string, 'confirmed' | 'dismissed'>;

export interface PhotoCheckRecord {
  id: string;
  itemId: string;
  photoUri: string;
  result: PhotoCheckResult;
  decisions: Decisions;
  /** True when the result is a canned sample (no backend), so the UI can label it. */
  sample: boolean;
  createdAt: number;
}

interface PhotoCheckRow {
  id: string;
  item_id: string;
  photo_uri: string;
  result_json: string;
  created_at: number;
}

export async function addPhotoCheck(
  db: SqlDb,
  carId: string,
  itemId: string,
  photoUri: string,
  result: PhotoCheckResult,
  sample: boolean,
  now = Date.now(),
) {
  const id = newId();
  await db.runAsync(
    'INSERT INTO photo_checks (id, car_id, item_id, photo_uri, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    carId,
    itemId,
    photoUri,
    JSON.stringify({ result, decisions: {}, sample }),
    now,
  );
  return id;
}

export async function listPhotoChecks(db: SqlDb, carId: string): Promise<PhotoCheckRecord[]> {
  const rows = await db.getAllAsync<PhotoCheckRow>('SELECT * FROM photo_checks WHERE car_id = ? ORDER BY created_at', carId);
  return rows.map((r) => {
    const stored = JSON.parse(r.result_json) as { result: PhotoCheckResult; decisions: Decisions; sample: boolean };
    return {
      id: r.id,
      itemId: r.item_id,
      photoUri: r.photo_uri,
      result: stored.result,
      decisions: stored.decisions ?? {},
      sample: !!stored.sample,
      createdAt: r.created_at,
    };
  });
}

export async function setDecision(db: SqlDb, photoCheckId: string, key: string, decision: 'confirmed' | 'dismissed'): Promise<void> {
  const row = await db.getFirstAsync<PhotoCheckRow>('SELECT * FROM photo_checks WHERE id = ?', photoCheckId);
  if (!row) return;
  const stored = JSON.parse(row.result_json);
  stored.decisions = { ...(stored.decisions ?? {}), [key]: decision };
  await db.runAsync('UPDATE photo_checks SET result_json = ? WHERE id = ?', JSON.stringify(stored), photoCheckId);
}

/** Number of photo checks run for a car (free tier: 10 on the free inspection, CLAUDE.md §9). */
export async function countPhotoChecks(db: SqlDb, carId: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM photo_checks WHERE car_id = ?', carId);
  return row?.n ?? 0;
}
