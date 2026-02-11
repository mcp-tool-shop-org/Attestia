# Registrum External Attestation Specification (XRPL)

## Status

| Property | Value |
|----------|-------|
| Type | Optional, Non-Authoritative |
| Governance Class | Class A (Non-Semantic), conditional |
| Default | Disabled |

This specification defines how Registrum may emit cryptographic attestations
to an external immutable ledger for the purpose of public witnessing.

---

## Purpose

External attestation exists to provide:

- Tamper-evident anchoring of Registrum snapshots
- Independent ordering guarantees
- Public auditability of structural decisions

External attestation does **not**:

- Participate in invariant evaluation
- Influence acceptance or rejection of transitions
- Resolve parity divergence
- Enable self-healing or recovery

**Registrum remains the sole constitutional authority.**

---

## Attestation Trigger Conditions

An attestation **MAY** be generated:

- When a snapshot is created
- At governance-defined checkpoints
- When a parity halt occurs

An attestation **MUST NOT** be generated:

- Per transition
- As a prerequisite for registration
- As part of invariant evaluation

**Failure to attest MUST NOT affect Registrum behavior.**

---

## Attestation Payload (Logical Form)

An attestation payload is a structural commitment with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `registrum_version` | string | Semantic version of Registrum |
| `snapshot_version` | string | Snapshot schema version |
| `snapshot_hash` | string | Hex-encoded content hash |
| `registry_hash` | string | Hex-encoded registry hash |
| `mode` | enum | `"dual"` \| `"legacy-only"` \| `"registry-only"` |
| `parity_status` | enum | `"AGREED"` \| `"HALTED"` |
| `transition_range` | object | `{ from: number, to: number }` |
| `state_count` | integer | Number of registered states |
| `ordering_max` | integer | Maximum order index assigned |

**All fields are mandatory.**
**No additional fields are permitted.**

### TypeScript Definition

```typescript
interface AttestationPayload {
  readonly registrum_version: string;
  readonly snapshot_version: string;
  readonly snapshot_hash: string;
  readonly registry_hash: string;
  readonly mode: "dual" | "legacy-only" | "registry-only";
  readonly parity_status: "AGREED" | "HALTED";
  readonly transition_range: {
    readonly from: number;
    readonly to: number;
  };
  readonly state_count: number;
  readonly ordering_max: number;
}
```

---

## Cryptographic Requirements

| Requirement | Specification |
|-------------|---------------|
| Hash algorithm | SHA-256 |
| Hash encoding | Hexadecimal, lowercase, 64 characters |
| Input encoding | Canonical JSON (deterministic key order) |
| Semantic data | Prohibited |

- All hashes **MUST** be content-addressed
- Hashes **MUST** be computed over canonical, deterministic encodings
- No semantic data may be included (no state content, no invariant names)

---

## XRPL Mapping

Attestations are encoded as memo-only XRPL transactions.

### Transaction Structure

| Property | Value |
|----------|-------|
| Transaction Type | Payment |
| Amount | Minimal (1 drop) |
| Destination | Attestation-controlled account |
| Trustlines | None |
| Hooks | None |
| Smart logic | None |

### Memo Encoding

Each payload field is encoded as a separate memo entry:

| Memo Type | Memo Data |
|-----------|-----------|
| `registrum:version` | Semver string |
| `registrum:snapshot_version` | Schema version |
| `registrum:snapshot_hash` | Hex string (64 chars) |
| `registrum:registry_hash` | Hex string (64 chars) |
| `registrum:mode` | `dual`, `legacy-only`, or `registry-only` |
| `registrum:parity` | `AGREED` or `HALTED` |
| `registrum:range` | `{from}-{to}` |
| `registrum:state_count` | Decimal integer |
| `registrum:ordering_max` | Decimal integer |

### Encoding Rules

| Rule | Value |
|------|-------|
| Character encoding | UTF-8 |
| Compression | None |
| Memo ordering | Alphabetical by type (deterministic) |
| Size limit | Per XRPL memo rules (max 1KB total) |

**XRPL validators do not interpret attestation contents.**

---

## Authority and Interpretation

Attestations are witnesses, not judges.

| Entity | Role |
|--------|------|
| XRPL | Attests that payload existed at ledger index |
| Registrum | Determines validity and meaning |

**No external system may treat attestations as authoritative instructions.**

### Authority Flow

```
Registrum → Attestation → XRPL
   ↑                         |
   |                         |
   └─── No authority flows ──┘
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Key compromise | Attestation keys isolated from execution |
| Availability | Loss of attestation capability does not halt Registrum |
| Replay attacks | Detectable via snapshot hash uniqueness |
| Tampering | XRPL consensus provides immutability |

---

## Non-Goals

This specification explicitly excludes:

| Excluded | Reason |
|----------|--------|
| On-ledger execution | Registrum is sovereign |
| Economic incentives | No coupling to transaction economics |
| Governance automation | Governance is human-driven |
| Invariant encoding | Invariants stay in Registrum |
| Dispute resolution | XRPL cannot judge validity |

---

## Governance

### Class A (Current)

Changes that remain Class A:

- Optional enablement
- Tooling improvements
- Documentation updates
- Implementation details

### Escalation to Class C

Changes that escalate to Class C (Semantic Change):

- Payload field additions or modifications
- Cryptographic guarantee changes
- Authority boundary changes
- Making attestation mandatory
- Making attestation blocking

**Any change that affects Registrum behavior requires formal governance approval.**

---

## Versioning

| Version | Status | Notes |
|---------|--------|-------|
| 1.0 | Draft | Initial specification |

Changes to this specification follow Registrum governance rules.

---

*This is a normative specification. Rationale is in `WHY_XRPL.md`.*
