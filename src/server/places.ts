import { DatabaseSync } from 'node:sqlite';

export type Place = {
  geonameId: number;
  name: string;
  countryCode: string;
  admin1: string | null;
  latitude: number;
  longitude: number;
  population: number;
};

type PlaceRow = {
  geoname_id: number;
  name: string;
  country_code: string;
  admin1_name: string | null;
  latitude: number;
  longitude: number;
  population: number;
};

const mapPlace = (row: PlaceRow): Place => ({
  geonameId: row.geoname_id,
  name: row.name,
  countryCode: row.country_code,
  admin1: row.admin1_name,
  latitude: row.latitude,
  longitude: row.longitude,
  population: row.population
});

function ftsPrefixQuery(value: string) {
  return value.trim().normalize('NFKC').split(/\s+/).filter(Boolean)
    .map((token) => `"${token.replaceAll('"', '""')}"*`).join(' AND ');
}

export function openPlaceDatabase(path: string) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    database.exec('PRAGMA query_only=ON');
    const requiredObjects = database.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE name IN ('metadata', 'places', 'places_fts')
    `).all() as { name: string }[];
    const metadata = Object.fromEntries((database.prepare(`
      SELECT key, value
      FROM metadata
      WHERE key IN ('dataset', 'dataset_version', 'license', 'row_count')
    `).all() as { key: string; value: string }[]).map(({ key, value }) => [key, value]));
    const objectNames = new Set(requiredObjects.map(({ name }) => name));
    const rowCount = Number(metadata.row_count);
    if (
      !['metadata', 'places', 'places_fts'].every((name) => objectNames.has(name)) ||
      metadata.dataset !== 'GeoNames cities1000' ||
      metadata.license !== 'CC BY 4.0' ||
      !metadata.dataset_version ||
      !Number.isSafeInteger(rowCount) ||
      rowCount <= 0
    ) {
      throw new Error('missing required schema or provenance');
    }
  } catch (error) {
    database.close();
    throw new Error('Bundled place index failed its schema and provenance check.', { cause: error });
  }
  return database;
}

export function searchPlaces(database: DatabaseSync, query: string, limit = 12) {
  const normalized = query.trim().normalize('NFKC').toLocaleLowerCase('en-US');
  const rows = database.prepare(`
    SELECT p.geoname_id,p.name,p.country_code,p.admin1_name,p.latitude,p.longitude,p.population
    FROM places_fts
    JOIN places p ON p.geoname_id=places_fts.rowid
    WHERE places_fts MATCH ?
    ORDER BY
      CASE WHEN lower(p.name)=? THEN 0 WHEN lower(p.name) LIKE ? THEN 1 ELSE 2 END,
      bm25(places_fts,6.0,3.0,1.0),p.population DESC,p.name COLLATE NOCASE
    LIMIT ?
  `).all(ftsPrefixQuery(query), normalized, `${normalized}%`, limit) as unknown as PlaceRow[];
  return rows.map(mapPlace);
}

export function getPlace(database: DatabaseSync, geonameId: number) {
  const row = database.prepare(`SELECT geoname_id,name,country_code,admin1_name,latitude,longitude,population FROM places WHERE geoname_id=?`)
    .get(geonameId) as PlaceRow | undefined;
  return row ? mapPlace(row) : undefined;
}

export function placeMetadata(database: DatabaseSync) {
  return Object.fromEntries((database.prepare('SELECT key,value FROM metadata').all() as { key: string; value: string }[])
    .map(({ key, value }) => [key, value]));
}
