# Architecture

Ryoiku is one Node.js 24 process. Fastify serves the versioned JSON API, health endpoints, and the Vite-built React single-page application. SQLite is the sole durable dependency and runs with foreign keys, WAL, a busy timeout, explicit transactions, and a schema migration ledger.

## Boundaries

- `src/server/app.ts`: HTTP policy, authentication, authorization, validation, domain endpoints, static delivery, and security headers.
- `src/server/database.ts`: versioned schema initialization, local country seeding, queries, transactions, and audit persistence.
- `src/server/domain.ts`: validated domain inputs and canonical CSV parsing/writing.
- `src/client`: React UI, API client, semantic design tokens, and the local Equal Earth SVG map.
- `/data/app.sqlite`: accounts, sessions, settings, travel records, previews, and audit events. Only `/data` is writable in the production container.

Country and city `visited` values are query projections over `visits`; they are never mutable source fields. A trip deletion nulls its visit references. A city deletion must reject, delete linked visits, or convert those visits to country-only records. Imports and restores use a persisted, expiring preview followed by one transaction.

Runtime has no external service dependency. Country metadata comes from pinned packages at database initialization and map geometry is bundled into the browser build. Geocoding is deliberately manual/local in 0.1.0; an external geocoder requires an explicit privacy-preserving adapter and operator opt-in.

The standard platform packages remain pinned in `package.json`. SQLite access currently uses Node's stable `DatabaseSync` API directly to preserve explicit migration and transaction control; this is the documented storage adapter for the 0.1 series. Any future ORM migration must preserve database compatibility and include rollback evidence.
