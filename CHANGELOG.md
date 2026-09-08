# Changelog

## 0.4.0 - 2026-09-08

- Integrate the approved staged Ryoiku icon source unchanged across canonical repository exports, browser favicons, Apple touch, PWA manifest, legacy app, and ZimaOS catalog consumers.
- Align the interface and Settings information architecture with ishiku design contract 5.1.1, including explicit Profile and Sessions sections.
- Update the embedded ishiku kit to 1.2.1 and consolidate verification, multi-architecture release, vulnerability scan, SBOM, provenance, and digest-promotion automation onto the current shared workflows.
- Update supported application and build dependencies, including the transitive `fast-uri` security fix; the high/critical dependency audit is clean.
- Replace the full GeoNames database scan on every startup with fail-closed schema and provenance checks while retaining the full integrity check in the deterministic dataset build.
- Refresh pinned Node.js and distroless container bases and keep the already assigned ZimaOS host port `65006` unchanged.
- Make the verified browser gate reproducible across Linux hosts by running Chromium and Firefox locally and WebKit as an unprivileged process in a digest-pinned official Playwright image.

## 0.3.0 - 2026-08-27

- Add true one-finger pan and two-finger pinch-to-zoom inside the world map without zooming the surrounding page.
- Open country and city detail views directly from taps while distinguishing taps from drag gestures.
- Show visited and wishlisted city markers at the default map view and add text, continent, country-status, city-status, and thematic map filters.
- Add independent country and city wishlist flows, including private offline city search without requiring a visit or manual city setup.
- Enforce wishlist city ownership and country consistency on the server; no schema or personal-data migration is required.

## 0.2.0 - 2026-08-21

- Add private offline place search with disambiguated city, region, country, and coordinate suggestions directly in the Add Visit flow.
- Create or reuse the selected city and its visit atomically while retaining manual cities and country-only visits.
- Bundle a pinned, attributed GeoNames cities1000 FTS5 index with no runtime third-party requests.
- Apply only an additive city lookup-index migration; existing databases, manual cities, country-only visits, CSV files, and JSON backups remain compatible.
- Rollback to the v0.1.3 image is supported after backing up `/data`; the new reference index is immutable application data and the personal schema change does not rewrite records.

## 0.1.3 - 2026-08-21

- Embed the release version, UTC build timestamp, and exact Git commit in the published container manifest instead of retaining Dockerfile development defaults.

## 0.1.2 - 2026-08-21

- Fix the Compose tmpfs declaration so Docker treats `/tmp:size=64m,mode=1777` as one mount instead of parsing `mode=1777` as an invalid mount path.
- Use the centrally assigned host and ZimaOS catalog port `65006` in production, development, documentation, and generated release notes.
- Replace the application icon with the newly approved theme-aligned map and location-pin artwork, including deterministic browser and Apple icon exports.

## 0.1.1 - 2026-08-17

- Removed the world map graticule and increased the default land-to-ocean contrast with theme-colored country fills across every theme and mode.

## 0.1.0 - 2026-08-17

- Add secure first-run administrator setup, Argon2id credentials, revocable server sessions, CSRF protection, and audit events.
- Add countries, custom cities, explicit duplicate-city merging, repeat visits, trips, wishlist entries, configurable country totals, derived status, and travel insights.
- Add a bundled Equal Earth map with local topology, pan, zoom, layers, city markers, and an accessible synchronized country list.
- Add a theme-aware world overview with direct layer controls, travel coverage, and a true recency view.
- Add validated preview-first CSV import, spreadsheet-safe CSV exports, and transactional JSON backup/restore.
- Add the responsive ishiku design 5 interface with six themes and light, dark, and system modes.
- Add hardened OCI and ZimaOS delivery, CI verification, SBOM/provenance publishing, security documentation, and release evidence gates.
- Keep managed skill metadata checksums stable across Windows and Linux checkouts.
- Publish the immutable OCI image through a lowercase GHCR repository reference.
