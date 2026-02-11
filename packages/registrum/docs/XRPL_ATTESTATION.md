# XRPL Attestation Specification

This document defines the attestation schema for Registrum → XRPL witness records.

---

## Purpose (Non-Negotiable)

XRPL is used only as an immutable, consensus-backed witness of Registrum's structural judgments.

XRPL never:
- Evaluates invariants
- Resolves divergence
- Influences Registrum behavior

Attestations are **write-only, append-only, non-authoritative**.

---

## Attestation Object

This is the semantic payload Registrum commits to XRPL.

```typescript
interface RegistrumAttestation {
  // Registrum version that produced this attestation
  registrum_version: string;  // "1.0.0"

  // Snapshot schema version
  snapshot_version: string;   // "1.0"

  // Content-addressed hash of snapshot
  snapshot_hash: string;      // hex-256

  // Content-addressed hash of registry
  registry_hash: string;      // hex-256

  // Operating mode at attestation time
  mode: "legacy" | "registry" | "dual";

  // Parity status between witnesses
  parity_status: "AGREED" | "HALTED";

  // Transition index range covered
  transition_range: {
    from: number;
    to: number;
  };

  // Number of registered states
  state_count: number;

  // Maximum order index assigned
  ordering_max: number;
}
```

---

## Field Rules

| Rule | Requirement |
|------|-------------|
| All hashes | Content-addressed (SHA-256) |
| No semantic data | No invariant names, no state content |
| No lineage detail | Snapshot hash covers this implicitly |
| No repair hints | Attestation cannot guide recovery |

**If any field requires interpretation, it does not belong here.**

---

## Attestation Frequency

Governance-controlled, not automatic:

| Trigger | Rationale |
|---------|-----------|
| Snapshot creation | Marks structural checkpoint |
| Governance-defined checkpoints | Periodic witness |
| Parity halt events | Records divergence moment |

**Never per-transition** — avoids economic coupling to transaction volume.

---

## XRPL Transaction Mapping

### Transaction Type

`Payment` with:
- Amount: Minimal (1 drop)
- Destination: Self-controlled attestation account
- No trustlines
- No hooks
- No smart logic

### Memo Encoding

Each attestation field maps to an XRPL memo triple: `(type, format, data)`

| Memo Type | Memo Data |
|-----------|-----------|
| `registrum:snapshot_hash` | hex string (64 chars) |
| `registrum:registry_hash` | hex string (64 chars) |
| `registrum:parity` | `AGREED` or `HALTED` |
| `registrum:range` | `{from}-{to}` (e.g., `1024-1151`) |
| `registrum:version` | semver string (e.g., `1.0.0`) |
| `registrum:mode` | `legacy`, `registry`, or `dual` |
| `registrum:state_count` | decimal integer |
| `registrum:ordering_max` | decimal integer |

### Encoding Rules

| Rule | Value |
|------|-------|
| Character encoding | UTF-8 |
| Compression | None |
| Memo ordering | Deterministic (alphabetical by type) |
| Size limit | XRPL memo rules (max 1KB total) |

XRPL validators do not interpret these — they only agree on ordering and immutability.

---

## Dual-Mode Attestation

XRPL strengthens dual-witness posture:

| Scenario | Attestation |
|----------|-------------|
| Both witnesses agree | `parity_status: AGREED` |
| Witnesses disagree | `parity_status: HALTED` |
| Governance resolves | New attestation with resolved state |

This mirrors multi-client blockchain discipline, not DAO governance.

---

## Self-Healing Constraints

Attestation cannot:

| Forbidden | Reason |
|-----------|--------|
| Trigger recovery | Registrum is sovereign |
| Override halt | Fail-closed is absolute |
| Select a witness | No external authority |
| Bias governance | Attestation is read-only |

Divergence resolves only via:
1. Explicit governance decision
2. New snapshot
3. New attestation

---

## Implementation Notes

### Attestation Account

- Dedicated XRPL account for attestations
- No other activity on this account
- Minimal XRP reserve only

### Transaction Verification

To verify an attestation:
1. Retrieve transaction by hash
2. Decode memos
3. Verify `snapshot_hash` matches local snapshot
4. Verify `registry_hash` matches local registry
5. Check ledger close time for ordering

### Replay from Attestation

Attestations support historical verification:
1. Load snapshot with matching `snapshot_hash`
2. Verify registry hash matches
3. Replay transitions to reach attested state
4. Confirm parity status

---

## Governance Classification

| Change | Classification |
|--------|----------------|
| Enable optional attestation | Class A |
| Make attestation default | Class B |
| Make attestation mandatory | Class C |
| Change attestation schema | Class B (if backward compatible) |
| Change attestation semantics | Class C |

Current status: **Specification only** (no implementation)

---

## Future Considerations

### Not In Scope

- Attestation of individual transitions
- XRPL hooks or smart contracts
- Cross-chain verification
- Economic incentives

### Potentially In Scope (Requires Governance)

- Multi-network attestation (XRPL + others)
- Attestation aggregation
- Third-party verification tooling

---

*This document defines attestation schema. Rationale is in `WHY_XRPL.md`.*
