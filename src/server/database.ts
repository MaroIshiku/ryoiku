import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { getCountryDataList } from 'countries-list';
import isoCountries from 'i18n-iso-countries';

export type Sqlite = DatabaseSync;

const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS accounts(
  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','user')), locale TEXT NOT NULL DEFAULT 'en-US',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login_at TEXT, disabled_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, csrf TEXT NOT NULL,
  created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, idle_expires_at INTEGER NOT NULL, absolute_expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS countries(
  code_alpha2 TEXT PRIMARY KEY, code_alpha3 TEXT UNIQUE, numeric_code TEXT, name_en TEXT NOT NULL, name_de TEXT NOT NULL,
  continent_code TEXT NOT NULL, region_name TEXT, kind TEXT NOT NULL, parent_country_code TEXT,
  map_geometry_id TEXT, default_un195_counted INTEGER NOT NULL, default_iso_counted INTEGER NOT NULL, enabled INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cities(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, country_code TEXT NOT NULL REFERENCES countries(code_alpha2),
  name TEXT NOT NULL, normalized_name TEXT NOT NULL, admin1 TEXT, admin2 TEXT, latitude REAL, longitude REAL,
  geocoder_provider TEXT, geocoder_external_id TEXT, is_custom INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cities_user_country_idx ON cities(user_id,country_code);
CREATE INDEX IF NOT EXISTS cities_user_name_idx ON cities(user_id,normalized_name);
CREATE TABLE IF NOT EXISTS trips(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, name TEXT NOT NULL,
  start_date TEXT, end_date TEXT, date_precision TEXT NOT NULL DEFAULT 'unknown', notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visits(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, country_code TEXT NOT NULL REFERENCES countries(code_alpha2),
  city_id TEXT REFERENCES cities(id) ON DELETE RESTRICT, trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
  start_date TEXT, end_date TEXT, date_precision TEXT NOT NULL DEFAULT 'unknown', notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visits_user_country_idx ON visits(user_id,country_code);
CREATE INDEX IF NOT EXISTS visits_user_city_idx ON visits(user_id,city_id);
CREATE INDEX IF NOT EXISTS visits_user_trip_idx ON visits(user_id,trip_id);
CREATE TABLE IF NOT EXISTS wishlist_items(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, country_code TEXT NOT NULL REFERENCES countries(code_alpha2),
  city_id TEXT REFERENCES cities(id) ON DELETE CASCADE, notes TEXT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS wishlist_target_idx ON wishlist_items(user_id,country_code,IFNULL(city_id,''));
CREATE TABLE IF NOT EXISTS app_settings(
  user_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, country_counting_mode TEXT NOT NULL DEFAULT 'un195',
  custom_country_total INTEGER NOT NULL DEFAULT 195 CHECK(custom_country_total BETWEEN 1 AND 999),
  default_map_layer TEXT NOT NULL DEFAULT 'visited', show_city_markers INTEGER NOT NULL DEFAULT 1,
  city_marker_zoom_threshold REAL NOT NULL DEFAULT 1.8, geocoder_enabled INTEGER NOT NULL DEFAULT 0,
  csv_spreadsheet_safe INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS import_previews(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, kind TEXT NOT NULL,
  payload TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events(
  id TEXT PRIMARY KEY, actor_id TEXT, event TEXT NOT NULL, result TEXT NOT NULL, request_id TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
`;

const continentNames: Record<string, string> = { AF: 'Africa', AN: 'Antarctica', AS: 'Asia', EU: 'Europe', NA: 'North America', OC: 'Oceania', SA: 'South America' };
const displayDe = new Intl.DisplayNames(['de-DE'], { type: 'region' });

function migrate(sqlite: Sqlite) {
  sqlite.exec(schema);
  const applied = sqlite.prepare('SELECT version FROM schema_migrations WHERE version = 1').get();
  if (!applied) sqlite.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(1,?)').run(new Date().toISOString());
  const second = sqlite.prepare('SELECT version FROM schema_migrations WHERE version = 2').get();
  if (!second) {
    const columns = sqlite.prepare('PRAGMA table_info(app_settings)').all() as { name: string }[];
    if (!columns.some((column) => column.name === 'custom_country_total')) sqlite.exec('ALTER TABLE app_settings ADD COLUMN custom_country_total INTEGER NOT NULL DEFAULT 195 CHECK(custom_country_total BETWEEN 1 AND 999)');
    sqlite.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(2,?)').run(new Date().toISOString());
  }
}

function seedCountries(sqlite: Sqlite) {
  const count = Number((sqlite.prepare('SELECT COUNT(*) AS count FROM countries').get() as { count: number }).count);
  if (count > 0) return;
  const insert = sqlite.prepare(`INSERT INTO countries(code_alpha2,code_alpha3,numeric_code,name_en,name_de,continent_code,region_name,kind,parent_country_code,map_geometry_id,default_un195_counted,default_iso_counted,enabled)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    for (const country of getCountryDataList()) {
      const alpha2 = country.iso2;
      const numeric = isoCountries.alpha2ToNumeric(alpha2) ?? null;
      const alpha3 = isoCountries.alpha2ToAlpha3(alpha2) ?? country.iso3 ?? null;
      const isoAssigned = !country.userAssigned && Boolean(alpha3);
      const un195 = isoAssigned && !country.partOf && alpha2 !== 'AQ' && !['TW','XK'].includes(alpha2);
      insert.run(alpha2, alpha3, numeric, country.name, displayDe.of(alpha2) ?? country.name,
        country.continent, continentNames[country.continent] ?? country.continent, country.partOf ? 'territory' : 'sovereign_state',
        country.partOf ?? null, numeric, un195 ? 1 : 0, isoAssigned ? 1 : 0, isoAssigned || alpha2 === 'XK' ? 1 : 0);
    }
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

export function openDatabase(path: string) {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  migrate(sqlite);
  seedCountries(sqlite);
  sqlite.prepare('DELETE FROM sessions WHERE absolute_expires_at < ? OR idle_expires_at < ?').run(Date.now(), Date.now());
  sqlite.prepare('DELETE FROM import_previews WHERE expires_at < ?').run(Date.now());
  return sqlite;
}

export function audit(sqlite: Sqlite, event: string, result: string, requestId: string, actorId?: string, metadata: Record<string, unknown> = {}) {
  sqlite.prepare('INSERT INTO audit_events(id,actor_id,event,result,request_id,metadata,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(randomUUID(), actorId ?? null, event, result, requestId, JSON.stringify(metadata), new Date().toISOString());
}

export function transaction<T>(sqlite: Sqlite, operation: () => T): T {
  sqlite.exec('BEGIN IMMEDIATE');
  try { const result = operation(); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
}
