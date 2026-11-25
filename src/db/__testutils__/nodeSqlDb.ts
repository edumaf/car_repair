// A real in-memory SQLite (Node's built-in node:sqlite) behind our SqlDb interface, for repository tests.
import { MIGRATIONS } from '../migrations';
import type { SqlDb } from '../sqlDb';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => any };

export function createTestDb(): SqlDb & { close(): void } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const m of MIGRATIONS) db.exec(m);
  const params = (p: unknown[]) => p.map((v) => (v === undefined ? null : v));
  return {
    async getAllAsync<T>(sql: string, ...p: (string | number | null)[]) {
      return db
        .prepare(sql)
        .all(...params(p))
        .map((r: object) => ({ ...r })) as T[];
    },
    async getFirstAsync<T>(sql: string, ...p: (string | number | null)[]) {
      const row = db.prepare(sql).get(...params(p));
      return (row ? { ...row } : null) as T | null;
    },
    async runAsync(sql: string, ...p: (string | number | null)[]) {
      return db.prepare(sql).run(...params(p));
    },
    async execAsync(sql: string) {
      db.exec(sql);
    },
    close: () => db.close(),
  };
}
