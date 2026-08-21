# Bundled place index

`geonames-cities.db3` is an immutable SQLite FTS5 search index generated from the GeoNames `cities1000` dump and `admin1CodesASCII.txt`. It contains no user data. Runtime opens it read-only, while selected results are copied into the separate personal database.

The exact input URLs, snapshot date, input hashes, license, and attribution are in `geonames-provenance.json`. The generated artifact contains 170,768 places and has SHA-256 `38e227d149cf10a63eb4014c48dafe9fa269d5fb8ac62a9c2fa9e3f2f46b9aed`.

To reproduce the artifact, download and verify the pinned inputs, extract `cities1000.txt`, then run:

```sh
node scripts/build-geonames-index.mjs cities1000.txt admin1CodesASCII.txt data/geonames-cities.db3
```

The generator verifies SQLite integrity before completing. GeoNames data is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); attribution: GeoNames geographical database.
