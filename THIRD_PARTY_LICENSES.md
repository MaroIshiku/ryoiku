# Third-party notices

Ryoiku is distributed under Apache-2.0. Its JavaScript dependency graph is recorded exactly in `package-lock.json`; release images additionally publish an SPDX SBOM.

## Bundled datasets

- `countries-list` 3.4.1 — MIT license. Country names and ISO metadata are copied into a new SQLite database during initialization.
- `world-atlas` 2.0.2 — ISC license. Bundled TopoJSON is derived from Natural Earth public-domain data.
- GeoNames `cities1000` snapshot 2026-08-21 — Creative Commons Attribution 4.0. The bundled place-search index is derived from the GeoNames geographical database. Source URLs, input hashes, generator, and artifact provenance are recorded in `data/geonames-provenance.json` and `data/README.md`.

## Runtime libraries

Direct runtime packages include Fastify and its official plugins, React, TanStack Router, Drizzle ORM, Zod, Argon2, D3 Geo, TopoJSON Client, `i18n-iso-countries`, `csv-parse`, `csv-stringify`, `tsx`, and React Hook Form. Their license texts and complete transitive inventory are available through the release SBOM and their package metadata in `node_modules`.

The canonical Ryoiku icon in `assets/icon-source.png` was supplied and approved by the repository owner. Its deterministic web exports and SHA-256 provenance are documented in `docs/ASSETS.md` and `assets/icon-notes.yaml`.
