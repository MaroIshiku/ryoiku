# Release process

Ryoiku uses immutable SemVer tags. A release candidate must have a dated `CHANGELOG.md` section and pass the repository's full verification command, including the browser matrix, dependency audit, Compose validation, Dockerfile check, image build, and smoke health check.

The tag workflow reruns the full gate, builds one amd64/arm64 image, scans its immutable digest for high and critical vulnerabilities, publishes OCI SBOM and provenance attestations, and only then promotes the same digest to the release and convenience tags and creates the GitHub release.

Operators should deploy by digest for reproducibility. Back up `/data`, read the changelog, pull the new digest, recreate the container, and verify readiness and representative data. Rollback instructions are in `BACKUP-RESTORE.md`.

No workflow may publish workspace planning material, screenshots containing user data, local databases, secrets, or backups. The Docker build context excludes all such paths.
