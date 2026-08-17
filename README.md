# Ryoiku

Ryoiku is a private, self-hosted travel history and world map. It records repeat visits, custom cities, trips, and wishes; derives visited countries and cities from those records; presents local-map insights; and offers previewed CSV transfer and JSON backup/restore.

The UI is English-only and implements ishiku design contract 5 with six themes, light/dark/system modes, a desktop navigation rail, and mobile bottom navigation. The map and country reference are bundled; normal runtime operation makes no third-party requests and contains no telemetry.

## Local development

Requirements: Node.js 24 and npm 11.

```sh
npm ci
npm run check
npm run test:e2e
DATABASE_PATH=./ryoiku.local.sqlite COOKIE_SECURE=false npm run dev
```

On Windows PowerShell, set the variables with `$env:DATABASE_PATH` and `$env:COOKIE_SECURE` before `npm run dev`. Open `http://127.0.0.1:8080`, create the first administrator, and keep the local database private.

## ZimaOS deployment

1. Copy `compose.yaml` to the target.
2. Replace `REPLACE-WITH-A-UNIQUE-SECRET-OF-AT-LEAST-32-CHARACTERS` with a unique random setup secret.
3. Confirm host port `8515` and data path `/DATA/AppData/i_ryoiku/Data` are free and backed up.
4. Start with `docker compose up -d`, open port 8515, enter the setup secret, and create the administrator.
5. Remove `ISHIKU_SETUP_SECRET` from the deployed Compose after successful setup, then recreate the container. Setup is also closed by database state.

The primary Compose is HTTP/LAN oriented and therefore sets `COOKIE_SECURE=false`. For internet or TLS reverse-proxy exposure, set `COOKIE_SECURE=true`, preserve the original host, force HTTPS, and ensure the proxy does not rewrite or log cookies. Do not expose an uninitialized instance without the setup secret.

For a local image build, use `docker compose -f compose.dev.yaml up --build`. Release images run as UID/GID 65532, use a read-only root filesystem, and persist only `/data`.

## Data portability

- Settings → Data exports visits, cities, and countries as CSV.
- Backup downloads a JSON snapshot of travel data and settings. It intentionally excludes passwords, sessions, and audit events.
- Restore always previews counts and supports transactional merge or replacement of travel data.
- Back up the complete `/data` directory before every image update in addition to keeping an application JSON backup.

See [backup and restore](docs/BACKUP-RESTORE.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), and [release operations](docs/RELEASE.md).

## Verification

```sh
npm ci
npm run check
npm run test:e2e
npm audit --audit-level=high
docker compose config --quiet
docker compose -f compose.dev.yaml config --quiet
docker build --check .
docker build -t ryoiku:verify .
node .ishiku/kit/scripts/verify-app . --full
```

`appspec.yaml` is the repository requirement authority. `.ishiku/requirements/traceability.yaml` links those requirements to executable evidence. No release should be called verified unless every required command actually passed.

## License

Apache-2.0. Dataset and dependency attribution is in `THIRD_PARTY_LICENSES.md`.
