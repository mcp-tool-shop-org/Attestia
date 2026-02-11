# Canonical Serialization

*Constitutional Law for Registrum Persistence*

---

## Status

**CONSTITUTIONAL ARTIFACT**

This document defines the canonical serialization format for Registrum snapshots.
Breaking this format breaks replay. Breaking replay breaks the constitutional guarantee
that any state can be explained by re-deriving it from recorded transitions.

**Changes to this specification require Class C governance.**

---

## Purpose

Registrum makes one promise about history: it can be replayed.

Canonical serialization is how that promise is kept. It defines:

1. **Snapshot Format** — The exact JSON structure for persisted state
2. **Replay Guarantees** — What external systems can rely on
3. **Invariants** — What must never change

---

## Snapshot Format

### Root Structure

```typescript
interface Snapshot {
  version: 1;
  timestamp: string;          // ISO 8601 format
  registrarMode: "legacy" | "registry";
  registeredStates: SerializedState[];
  registrationLog: LogEntry[];
  metadata: SnapshotMetadata;
}
```

### SerializedState

```typescript
interface SerializedState {
  id: string;                 // StateID — non-empty, explicit
  parentId: string | null;    // null for root states
  orderIndex: number;         // Total ordering position
  structure: Record<string, unknown>;  // Structural fields
  data: unknown;              // Opaque payload (preserved exactly)
}
```

### LogEntry

```typescript
interface LogEntry {
  orderIndex: number;
  stateId: string;
  parentId: string | null;
  timestamp: string;          // ISO 8601 format
}
```

### SnapshotMetadata

```typescript
interface SnapshotMetadata {
  invariantCount: number;
  totalRegistrations: number;
  rootStateCount: number;
}
```

---

## Determinism Requirements

### Key Ordering

All object keys MUST be serialized in **deterministic order**:

1. For known schema objects: declared field order
2. For `structure` and `data` fields: **lexicographic key sort**

This is enforced by the serializer and verified by tests.

### Numeric Precision

- `orderIndex` values are integers
- No floating-point values in structural fields
- JSON number serialization follows ECMA-404

### String Encoding

- UTF-8 encoding
- No BOM (Byte Order Mark)
- Newlines normalized to `\n`
- No trailing whitespace

### Timestamp Format

- ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Always UTC (Z suffix)
- Millisecond precision

---

## Replay Guarantees

### G1: Byte-Identical Snapshots

Given:
- Snapshot A from Registrar R1
- Registrar R2 rehydrated from A
- Snapshot B from R2

Then: `SHA-256(A) === SHA-256(B)`

### G2: Order Preservation

The `registrationLog` preserves exact registration order.
Replaying transitions in log order produces identical state.

### G3: Lineage Reconstruction

From any snapshot, the complete lineage of any state can be reconstructed
by traversing `parentId` chains.

### G4: Invariant Evaluation Parity

A snapshot produced by legacy mode and one produced by registry mode
with identical inputs will have identical `registeredStates` entries.

---

## What Is NOT Guaranteed

| Property | Reason |
|----------|--------|
| Timestamp identity | Replay timestamp differs from original |
| Metadata identity | Metadata may reflect replay context |
| External attestations | Attestations are not part of canonical format |
| Invariant definitions | Invariants are evaluated, not stored |

---

## Rehydration Contract

When a Registrar is rehydrated from a snapshot:

1. **State is restored exactly** — All registered states match snapshot
2. **Order index continues** — New registrations get `lastOrderIndex + 1`
3. **Invariants re-apply** — No registration is "grandfathered"
4. **History is not altered** — Rehydration is read-only on source

### Rehydration Does NOT

- Re-evaluate past transitions
- Reject states that passed originally
- Modify the registration log
- Create new attestations

---

## Constitutional Violations

The following changes to serialization format are **constitutional violations**:

| Change | Why Prohibited |
|--------|----------------|
| Field renaming | Breaks existing snapshots |
| Field removal | Loses information |
| Key order change | Breaks hash verification |
| Type changes | Breaks deserialization |
| Encoding changes | Breaks byte identity |

### Permitted Changes (Class B)

| Change | Requirement |
|--------|-------------|
| New optional field | Must have default value |
| Version increment | Must support migration |
| Metadata extension | Must not affect replay |

---

## Verification

### Test Coverage

The following tests verify canonical serialization:

| Test File | Coverage |
|-----------|----------|
| `tests/persistence/serializer.test.ts` | Key ordering, determinism |
| `tests/persistence/snapshot.test.ts` | Round-trip identity |
| `tests/persistence/replay.test.ts` | Replay guarantees |
| `tests/parity/persistence.parity.test.ts` | Cross-engine parity |

### Hash Verification

External systems can verify snapshot integrity:

```typescript
import { createHash } from "crypto";

function verifySnapshot(json: string): string {
  return createHash("sha256").update(json, "utf8").digest("hex");
}
```

---

## Relationship to External Witnesses

External witnesses (XRPL, etc.) may attest to snapshot hashes.

However:
- Witnesses do not define canonical format
- Attestation failure does not invalidate snapshots
- Canonical format is internal to Registrum

See `docs/ATTESTATION_SPEC.md` for witness boundaries.

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1 | 2025-02-05 | Initial specification |

---

## Closing Statement

Canonical serialization is not a feature.
It is a promise.

Breaking this format breaks the system's ability to explain itself.
That is not a bug. That is a constitutional violation.

---

*This document is a constitutional artifact.*
*Changes require Class C governance and evidence of necessity.*
