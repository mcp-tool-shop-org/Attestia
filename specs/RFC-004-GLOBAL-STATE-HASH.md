# RFC-004: GlobalStateHash Specification

**Status:** Draft
**Created:** 2026-02-11
**Author:** Attestia Working Group

---

## Abstract

This specification defines the GlobalStateHash — a single content-addressed SHA-256 digest covering the entire Attestia system state. It specifies the algorithm for computing subsystem hashes, combining them into a global digest, and using the result for deterministic replay verification. Two independent instances processing the same events MUST produce the same GlobalStateHash.

---

## Status of This Document

Draft. This document is subject to revision before finalization.

---

## 1. Introduction

Event-sourced systems guarantee that replaying the same events produces the same state. But proving this requires a way to compare state across instances. A simple content hash of the entire state is fragile — any change in serialization breaks it.

Attestia's GlobalStateHash solves this by using RFC 8785 canonical JSON serialization and a hierarchical SHA-256 composition. Each subsystem is hashed independently, then the subsystem hashes are combined. This provides both a global comparison point and per-subsystem divergence detection.

---

## 2. Terminology

All terms are defined in [DEFINITIONS.md](DEFINITIONS.md). Key terms:

- **Global State Hash**, **Subsystem Hash**, **Deterministic Replay**, **Verification Verdict**
- **RFC 8785 (JCS)**, **SHA-256**

---

## 3. Specification

### 3.1 GlobalStateHash Structure

```typescript
interface GlobalStateHash {
  readonly hash: string;
  readonly computedAt: string;
  readonly subsystems: {
    readonly ledger: string;
    readonly registrum: string;
  };
}
```

- `hash`: SHA-256 hex digest (64 lowercase characters) of the combined subsystem hashes.
- `computedAt`: ISO 8601 timestamp of when the hash was computed. This is metadata only — it MUST NOT affect the hash value.
- `subsystems.ledger`: SHA-256 hex digest of the ledger snapshot.
- `subsystems.registrum`: SHA-256 hex digest of the registrum snapshot.

### 3.2 Subsystems

The current specification defines two subsystems:

| Subsystem | Source | Description |
|-----------|--------|-------------|
| `ledger` | `LedgerSnapshot` | All accounts, entries, and balances |
| `registrum` | `RegistrarSnapshotV1` | All structural states and lineage |

Future RFCs MAY add additional subsystems. The composition algorithm in Section 4.2 MUST accommodate new subsystems by including them in the canonical key ordering.

### 3.3 Verification Result

```typescript
type VerificationVerdict = "PASS" | "FAIL";

interface VerificationResult {
  readonly verdict: VerificationVerdict;
  readonly globalHash: GlobalStateHash;
  readonly discrepancies: readonly VerificationDiscrepancy[];
  readonly verifiedAt: string;
}

interface VerificationDiscrepancy {
  readonly subsystem: "ledger" | "registrum" | "global";
  readonly expected: string;
  readonly actual: string;
  readonly description: string;
}
```

A verdict of `PASS` MUST only be returned when all subsystem hashes and the global hash match exactly. Any difference, in any subsystem, MUST produce a `FAIL` verdict with one or more discrepancies.

### 3.4 Replay Verification

Replay verification proves that state can be reconstructed from snapshots:

```typescript
interface ReplayInput {
  readonly ledgerSnapshot: LedgerSnapshot;
  readonly registrumSnapshot: RegistrarSnapshotV1;
  readonly expectedHash?: string;
}

interface ReplayResult {
  readonly verdict: VerificationVerdict;
  readonly replayedHash: GlobalStateHash;
  readonly originalHash: GlobalStateHash;
  readonly discrepancies: readonly VerificationDiscrepancy[];
}
```

The replay process:

1. Restore a Ledger instance from the ledger snapshot.
2. Restore a StructuralRegistrar instance from the registrum snapshot.
3. Take fresh snapshots of both restored instances.
4. Compute the GlobalStateHash of the fresh snapshots.
5. Compare with the expected hash.

If the hashes match, the state is proven lossless and deterministic.

---

## 4. Algorithms

### 4.1 Subsystem Hashing

For each subsystem snapshot:

1. Remove non-structural metadata (e.g., `createdAt` timestamps that vary between snapshot calls).
2. Serialize the remaining fields using RFC 8785 (JSON Canonicalization Scheme).
3. Compute SHA-256 of the canonical string.

**Ledger snapshot hashing:**
```
ledgerHash = sha256(canonicalize(ledgerSnapshot without createdAt))
```

**Registrum snapshot hashing:**
```
registrumHash = sha256(canonicalize(registrumSnapshot))
```

### 4.2 Global Hash Composition

1. Construct a JSON object with subsystem names as keys and their hashes as values:
   ```json
   { "ledger": "<ledgerHash>", "registrum": "<registrumHash>" }
   ```

2. Canonicalize this object using RFC 8785. Since RFC 8785 sorts keys lexicographically, the key order is deterministic regardless of insertion order.

3. Compute SHA-256 of the canonical string:
   ```
   globalHash = sha256(canonicalize({ ledger: ledgerHash, registrum: registrumHash }))
   ```

### 4.3 Adding New Subsystems

When a new subsystem is added:

1. Define its snapshot type.
2. Define its hashing algorithm (RFC 8785 + SHA-256).
3. Add its key to the composition object.
4. RFC 8785 lexicographic sorting ensures deterministic ordering.

This is a breaking change — the GlobalStateHash value will differ from previous versions. A new RFC MUST document the migration path.

---

## 5. Security Considerations

- **Content addressing**: Any change to any field in any subsystem produces a different GlobalStateHash. This includes additions, deletions, and modifications.
- **Canonicalization dependency**: The correctness of this specification depends entirely on RFC 8785 compliance. Non-compliant canonicalization will produce different hashes for identical state.
- **Timestamp exclusion**: The `computedAt` field is excluded from hash computation because it changes on every call. Implementations MUST NOT include `computedAt` in the hash input.
- **Snapshot completeness**: The GlobalStateHash covers only the subsystems listed in Section 3.2. State not captured in these snapshots (e.g., in-memory audit log) is not covered.

---

## 6. Conformance

A conforming implementation:

1. MUST compute subsystem hashes using RFC 8785 + SHA-256 as specified in Section 4.1.
2. MUST compose the global hash using the algorithm in Section 4.2.
3. MUST produce identical GlobalStateHash values for identical subsystem state, regardless of when or where the computation runs.
4. MUST report per-subsystem discrepancies when verification fails.
5. MUST support replay verification as specified in Section 3.4.

---

## 7. References

- [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- `packages/verify/src/global-state-hash.ts` — computeGlobalStateHash, hashLedgerSnapshot, hashRegistrumSnapshot
- `packages/verify/src/types.ts` — GlobalStateHash, VerificationResult, ReplayResult
- `packages/verify/src/replay.ts` — verifyByReplay
