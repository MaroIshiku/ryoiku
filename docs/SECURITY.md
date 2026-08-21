# Security

Ryoiku stores sensitive location history. Run it on a trusted host, use TLS outside a trusted LAN, restrict network access, keep the host and image updated, and protect backups like the live database.

## Controls

- First-run setup can require a 32+ character deployment secret and closes after the first account.
- Passwords use Argon2id (19 MiB, two iterations, one lane). Login errors are generic and rate limited.
- Server-side sessions store only SHA-256 token hashes, expire after 30 minutes idle or eight hours absolute, and can be revoked. Cookies are HttpOnly, SameSite=Strict, Path=/, and `Secure` in TLS mode.
- Every authenticated mutation requires a per-session CSRF token. Resource queries and mutations are scoped to the authenticated account.
- Zod validation, a 2.2 MB request limit, prepared SQL statements, foreign keys, atomic transactions, strict CSP and related headers, formula-safe CSV, and redacted logs limit common injection and disclosure paths.
- Runtime has no analytics, telemetry, remote fonts, map tiles, or required outbound calls.
- Place autocomplete uses the bundled read-only GeoNames index. Queries require authentication and CSRF, are length- and rate-limited, travel in POST bodies, and are redacted from logs; clients submit stable result IDs and the server re-resolves authoritative country and coordinate values.
- The image runs as UID 65532 with dropped capabilities, no-new-privileges, and a read-only root filesystem.

These controls address OWASP ASVS 2.1/2.2 credential lifecycle, 3.2 session binding, 3.4 cookie attributes, 4.1 access control, 4.2 CSRF, 5.1 input validation, 5.3 output encoding, 8.3 sensitive-data handling, 9.1 transport protection, 12.3 file/content handling, and 14.4 security headers/configuration.

## Threat model

Protected assets are travel history, notes, credentials, session tokens, the database, and backups. Primary threats are pre-setup takeover, credential guessing, stolen sessions, cross-site mutation, cross-account ID access, malicious CSV/backup content, log disclosure, dependency compromise, and writable-container persistence. The controls above reduce those risks; host compromise, a malicious administrator, an exposed backup, weak operator secrets, and traffic over operator-selected plain HTTP remain outside the application's trust boundary.

## Reporting and response

Report vulnerabilities privately to the repository owner; do not include real travel data, credentials, or database copies. Rotate the administrator password and setup/bootstrap secrets, revoke sessions by restarting after removing affected session rows or restoring a known-good database, preserve bounded audit evidence, patch, rerun the complete release gate, and publish a new immutable image. Never publish a vulnerable database as diagnostic evidence.
