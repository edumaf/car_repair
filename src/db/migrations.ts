// Ordered schema migrations (CLAUDE.md §5.2), tracked with SQLite's user_version pragma.
// Append new entries; never edit a migration that has shipped.
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE IF NOT EXISTS cars (
    id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL,
    vin TEXT,
    year INTEGER,
    make TEXT,
    model TEXT,
    trim TEXT,
    body TEXT,
    powertrain TEXT NOT NULL DEFAULT 'gas' CHECK (powertrain IN ('gas','diesel','hybrid','ev')),
    engine_desc TEXT,
    drive TEXT,
    asking_price REAL,
    mileage INTEGER,
    seller_type TEXT NOT NULL DEFAULT 'unknown' CHECK (seller_type IN ('private','dealer','unknown')),
    listing_text TEXT,
    nickname TEXT,
    status TEXT NOT NULL DEFAULT 'considering' CHECK (status IN ('considering','bought','passed')),
    vehicle_report_json TEXT,
    verdict TEXT,
    verdict_json TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cars_updated_at ON cars (updated_at DESC);

  CREATE TABLE IF NOT EXISTS answers (
    car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    answer TEXT NOT NULL CHECK (answer IN ('ok','problem','not_sure','skip')),
    ai_suggested INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    photo_uris_json TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (car_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS photo_checks (
    id TEXT PRIMARY KEY NOT NULL,
    car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    photo_uri TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS photo_checks_car ON photo_checks (car_id, item_id);

  CREATE TABLE IF NOT EXISTS comparables (
    id TEXT PRIMARY KEY NOT NULL,
    car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    price REAL NOT NULL,
    mileage INTEGER,
    year INTEGER,
    source_note TEXT
  );
  CREATE INDEX IF NOT EXISTS comparables_car ON comparables (car_id);

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2: answers.answer may be NULL (a note or photo saved before the item is answered).
  `
  CREATE TABLE answers_v2 (
    car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    answer TEXT CHECK (answer IS NULL OR answer IN ('ok','problem','not_sure','skip')),
    ai_suggested INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    photo_uris_json TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (car_id, item_id)
  );
  INSERT INTO answers_v2 SELECT car_id, item_id, answer, ai_suggested, note, photo_uris_json, updated_at FROM answers;
  DROP TABLE answers;
  ALTER TABLE answers_v2 RENAME TO answers;
  `,
];
