# Backup, restore, and rollback

Use two independent backups:

1. Download the JSON backup from Settings → Data. It includes cities, trips, visits, wishlist entries, and settings but excludes credentials and sessions.
2. Stop the container or otherwise obtain a SQLite-consistent snapshot of the complete `/data` directory. On ZimaOS this is `/DATA/AppData/i_ryoiku/Data`.

Test restoration periodically on an isolated instance. In the application, select the JSON file, inspect the preview, then choose merge or replace travel data. The commit is transactional; invalid foreign keys roll back the entire restore.

The bundled place index is immutable application data and is intentionally excluded from `/data` backups. When an offline search result is selected, its display name, country, region, coordinates, provider, and stable external ID are copied into the user-owned city record and included in JSON and SQLite backups.

Before an upgrade, record the deployed image digest and back up `/data`. If rollback is required, stop the new container, restore the matching pre-upgrade data snapshot when the release notes declare a schema change, pin the previous image by digest, start it, and verify `/health/ready`, login, map totals, and a representative visit. Never combine an older binary with a database that has an explicitly incompatible migration.
