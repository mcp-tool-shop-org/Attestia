# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Attestia, please report it responsibly.

**Email:** security@attestia.dev

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

**Response timeline:**
- Acknowledgment within 48 hours
- Initial assessment within 7 days
- Fix timeline communicated within 14 days

We will not take legal action against researchers who follow responsible disclosure.

---

## Security Model Summary

Attestia is designed for financial infrastructure with tamper-evident guarantees.

### Authentication & Authorization

- API key authentication via `X-Api-Key` header
- JWT bearer authentication via `Authorization: Bearer` header (HMAC-SHA256)
- Role-based access control: `admin > operator > viewer`
- Auth-derived tenant isolation (tenant ID from identity, not request)

### Data Integrity

- **Event log**: SHA-256 hash chain (RFC 8785 canonicalization). Verified on startup.
- **Snapshots**: `stateHash` computed on save, verified on load.
- **Reconciliation reports**: `reportHash` computed at creation, verified at attestation.
- **On-chain witness**: XRPL payment memo with report hash (immutable ledger).
- **Global state**: `GlobalStateHash` — deterministic replay produces identical hash.

### Operational Controls

- Token-bucket rate limiting per identity
- Idempotency-Key header support (prevents duplicate mutations)
- Structured error envelopes (no internal details leaked)
- Structured logging excludes auth headers
- Graceful shutdown on SIGTERM/SIGINT

### Threat Model

See [THREAT_MODEL.md](THREAT_MODEL.md) for full STRIDE analysis.
See [CONTROL_MATRIX.md](CONTROL_MATRIX.md) for threat-to-control-to-test mapping.

### Known Limitations

- JWT secret rotation requires service restart
- Audit log is in-memory (lost on restart; events persist)
- Single-node deployment (no HA replication)
- XRPL witness uses single-sig (multi-sig planned for Phase 10)

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| Current `main` | Yes |
| Tagged releases | Yes |
| Pre-release branches | Best effort |

---

## Dependencies

Attestia minimizes external dependencies. The critical path (types, registrum, ledger) has zero or one runtime dependency. Chain SDKs (`viem`, `xrpl`) and the HTTP framework (`hono`) are used only at system boundaries.

All dependencies are pinned via `pnpm-lock.yaml` and audited in CI.
