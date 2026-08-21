# Changelog

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
