# Architecture

Ryoiku is one Node.js 24 process. Fastify serves the versioned JSON API, health endpoints, and the Vite-built React single-page application. SQLite is the sole durable dependency and runs with foreign keys, WAL, a busy timeout, explicit transactions, and a schema migration ledger.

## Boundaries

- `src/server/app.ts`: HTTP policy, authentication, authorization, validation, domain endpoints, static delivery, and security headers.
- `src/server/database.ts`: versioned schema initialization, local country seeding, queries, transactions, and audit persistence.
- `src/server/domain.ts`: validated domain inputs and canonical CSV parsing/writing.
- `src/server/places.ts`: bounded prefix search and authoritative lookup over the bundled read-only GeoNames FTS5 index.
- `src/client`: React UI, API client, semantic design tokens, and the local Equal Earth SVG map.
- `/data/app.sqlite`: accounts, sessions, settings, travel records, previews, and audit events. Only `/data` is writable in the production container.
- `/app/reference/geonames-cities.db3`: immutable application reference data; it never stores user searches or travel history.

Country and city `visited` values are query projections over `visits`; they are never mutable source fields. A trip deletion nulls its visit references. A city deletion must reject, delete linked visits, or convert those visits to country-only records. Imports and restores use a persisted, expiring preview followed by one transaction.

Runtime has no external service dependency. Country metadata comes from pinned packages at database initialization, map geometry is bundled into the browser build, and place discovery queries the local GeoNames index. Search terms are sent in authenticated, CSRF-protected POST bodies so they do not appear in request URLs, are explicitly redacted from structured logs, and never leave the server. Selecting a GeoNames result resolves the server-owned record again, verifies its country, and transactionally reuses or creates the city before creating the visit. Manual cities and country-only visits remain independent fallbacks.

The standard platform packages remain pinned in `package.json`. SQLite access currently uses Node's stable `DatabaseSync` API directly to preserve explicit migration and transaction control; this is the documented storage adapter for the 0.1 series. Any future ORM migration must preserve database compatibility and include rollback evidence.
