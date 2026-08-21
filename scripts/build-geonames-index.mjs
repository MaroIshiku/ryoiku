import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, rmSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { basename, resolve } from 'node:path';

const [citiesArgument, adminArgument, outputArgument] = process.argv.slice(2);
if (!citiesArgument || !adminArgument || !outputArgument) {
  console.error('Usage: node scripts/build-geonames-index.mjs <cities1000.txt> <admin1CodesASCII.txt> <output.db3>');
  process.exit(2);
}

const citiesPath = resolve(citiesArgument);
const adminPath = resolve(adminArgument);
const outputPath = resolve(outputArgument);
for (const path of [citiesPath, adminPath]) {
  if (!existsSync(path)) throw new Error(`Input file not found: ${path}`);
}

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const admin1 = new Map();
for (const line of readFileSync(adminPath, 'utf8').split(/\r?\n/)) {
  if (!line) continue;
  const [code, name] = line.split('\t');
  if (code && name) admin1.set(code, name);
}

rmSync(outputPath, { force: true });
const database = new DatabaseSync(outputPath);
database.exec(`
  PRAGMA journal_mode=OFF;
  PRAGMA synchronous=OFF;
  PRAGMA temp_store=MEMORY;
  PRAGMA page_size=4096;
  CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
  CREATE TABLE places(
    geoname_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    ascii_name TEXT NOT NULL,
    alternate_names TEXT NOT NULL,
    country_code TEXT NOT NULL,
    admin1_code TEXT,
    admin1_name TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    population INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX places_country_name_idx ON places(country_code, name COLLATE NOCASE);
  CREATE VIRTUAL TABLE places_fts USING fts5(
    name,
    ascii_name,
    alternate_names,
    content='places',
    content_rowid='geoname_id',
    tokenize='unicode61 remove_diacritics 2'
  );
`);

const insert = database.prepare(`INSERT INTO places(
  geoname_id,name,ascii_name,alternate_names,country_code,admin1_code,admin1_name,latitude,longitude,population
) VALUES(?,?,?,?,?,?,?,?,?,?)`);
const metadata = database.prepare('INSERT INTO metadata(key,value) VALUES(?,?)');
database.exec('BEGIN');
let count = 0;
try {
  const lines = createInterface({ input: createReadStream(citiesPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) {
    const fields = line.split('\t');
    if (fields.length < 19) throw new Error(`Malformed GeoNames row ${count + 1}`);
    const [id, name, asciiName, alternateNames, latitude, longitude, , , countryCode, , admin1Code, , , , population] = fields;
    insert.run(
      Number(id), name, asciiName, alternateNames, countryCode, admin1Code || null,
      admin1.get(`${countryCode}.${admin1Code}`) ?? null, Number(latitude), Number(longitude), Number(population || 0)
    );
    count += 1;
  }
  metadata.run('dataset', 'GeoNames cities1000');
  metadata.run('dataset_version', '2026-08-21');
  metadata.run('source_file', basename(citiesPath));
  metadata.run('source_sha256', digest(citiesPath));
  metadata.run('admin1_source_file', basename(adminPath));
  metadata.run('admin1_source_sha256', digest(adminPath));
  metadata.run('license', 'CC BY 4.0');
  metadata.run('row_count', String(count));
  database.exec('COMMIT');
} catch (error) {
  database.exec('ROLLBACK');
  database.close();
  rmSync(outputPath, { force: true });
  throw error;
}

database.exec(`
  INSERT INTO places_fts(places_fts) VALUES('rebuild');
  INSERT INTO places_fts(places_fts) VALUES('optimize');
  VACUUM;
`);
const integrity = database.prepare('PRAGMA integrity_check').get()?.integrity_check;
database.close();
if (integrity !== 'ok') throw new Error(`Generated database failed integrity check: ${integrity}`);
console.log(`Generated ${outputPath} with ${count} places.`);
