import { writeFileSync, mkdtempSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openPlaceDatabase } from '../src/server/places.js';

describe('bundled place index', () => {
  it('opens the immutable GeoNames index without a full startup scan', () => {
    const database = openPlaceDatabase('data/geonames-cities.db3');
    expect(database.prepare('PRAGMA query_only').get()).toEqual({ query_only: 1 });
    database.close();
  });

  it('rejects a valid SQLite file without the expected schema and provenance', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'ryoiku-places-')), 'empty.db3');
    const database = new DatabaseSync(path);
    database.close();
    expect(() => openPlaceDatabase(path)).toThrow(
      'Bundled place index failed its schema and provenance check.',
    );
  });

  it('rejects a corrupt database file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'ryoiku-places-')), 'corrupt.db3');
    writeFileSync(path, 'not a SQLite database');
    expect(() => openPlaceDatabase(path)).toThrow();
  });
});
