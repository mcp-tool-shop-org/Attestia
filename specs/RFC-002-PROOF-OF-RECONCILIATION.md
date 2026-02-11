# RFC-002: Proof-of-Reconciliation Protocol

**Status:** Draft
**Created:** 2026-02-11
**Author:** Attestia Working Group

---

## Abstract

This specification defines the Proof-of-Reconciliation protocol used by Attestia to cross-reference financial records across multiple subsystems. It covers the 3-dimensional matching algorithm (intent, ledger, chain), match status taxonomy, reconciliation report structure, report hashing, and attestation record format. A conforming implementation can independently verify that financial records are consistent across all layers of the system.

---

## Status of This Document

Draft. This document is subject to revision before finalization.

---

## 1. Introduction

On-chain financial systems maintain records in multiple independent subsystems: intent declarations (what was planned), ledger entries (what was recorded), and chain events (what actually happened on-chain). These records can diverge due to execution failures, timing delays, or unauthorized modifications.

Reconciliation is the systematic comparison of these records. Attestia's reconciliation protocol matches records across three dimensions and produces a cryptographically hashed report suitable for attestation and on-chain witnessing.

---

## 2. Terminology

All terms are defined in [DEFINITIONS.md](DEFINITIONS.md). Key terms:

- **Reconciliation**, **Match Status**, **Reconciliation Report**, **Attestation**
- **Intent**, **Ledger Entry**, **Money**

---

## 3. Specification

### 3.1 Reconciliation Dimensions

Reconciliation operates across three axes:

1. **Intent ↔ Ledger**: Does each intent have corresponding ledger entries?
2. **Ledger ↔ Chain**: Does each ledger entry have a corresponding on-chain event?
3. **Intent ↔ Chain**: Does each intent execution match an on-chain transaction?

Each dimension produces an independent set of match results.

### 3.2 Match Status

Every match MUST be assigned one of the following statuses:

| Status | Meaning |
|--------|---------|
| `matched` | Both sides present and values agree |
| `amount-mismatch` | Both sides present but amounts differ |
| `missing-ledger` | Intent exists but no ledger entry found |
| `missing-intent` | Ledger entry exists but no intent found |
| `missing-chain` | Ledger/intent exists but no on-chain event found |
| `unmatched` | Could not correlate records |

### 3.3 Match Records

#### Intent-Ledger Match

```typescript
interface IntentLedgerMatch {
  readonly intentId: string;
  readonly correlationId: string;
  readonly status: MatchStatus;
  readonly intentAmount?: Money;
  readonly ledgerAmount?: Money;
  readonly discrepancies: readonly string[];
}
```

#### Ledger-Chain Match

```typescript
interface LedgerChainMatch {
  readonly correlationId: string;
  readonly txHash?: string;
  readonly chainId?: string;
  readonly status: MatchStatus;
  readonly ledgerAmount?: Money;
  readonly chainAmount?: string;
  readonly chainDecimals?: number;
  readonly discrepancies: readonly string[];
}
```

#### Intent-Chain Match

```typescript
interface IntentChainMatch {
  readonly intentId: string;
  readonly txHash?: string;
  readonly chainId?: string;
  readonly status: MatchStatus;
  readonly intentAmount?: Money;
  readonly chainAmount?: string;
  readonly chainDecimals?: number;
  readonly discrepancies: readonly string[];
}
```

### 3.4 Reconciliation Scope

A reconciliation operation MAY be scoped to a subset of records:

```typescript
interface ReconciliationScope {
  readonly from?: string;       // ISO 8601 start
  readonly to?: string;         // ISO 8601 end
  readonly intentId?: string;   // Specific intent
  readonly chainId?: string;    // Specific chain
  readonly correlationId?: string;
}
```

An unscoped reconciliation MUST consider all records.

### 3.5 Reconciliation Report

The complete output of a reconciliation operation:

```typescript
interface ReconciliationReport {
  readonly id: string;
  readonly scope: ReconciliationScope;
  readonly timestamp: string;
  readonly intentLedgerMatches: readonly IntentLedgerMatch[];
  readonly ledgerChainMatches: readonly LedgerChainMatch[];
  readonly intentChainMatches: readonly IntentChainMatch[];
  readonly summary: ReconciliationSummary;
}
```

### 3.6 Summary Statistics

```typescript
interface ReconciliationSummary {
  readonly totalIntents: number;
  readonly totalLedgerEntries: number;
  readonly totalChainEvents: number;
  readonly matchedCount: number;
  readonly mismatchCount: number;
  readonly missingCount: number;
  readonly allReconciled: boolean;
  readonly discrepancies: readonly string[];
}
```

`allReconciled` MUST be `true` if and only if `mismatchCount === 0` and `missingCount === 0`.

### 3.7 Report Hashing

The reconciliation report hash is computed as:

```
reportHash = sha256(canonicalize(report))
```

Where `canonicalize` is RFC 8785 (JCS) serialization. This hash MUST be computed at report creation time and included in any attestation record.

### 3.8 Attestation Record

An attestation record formally certifies a reconciliation result:

```typescript
interface AttestationRecord {
  readonly id: string;
  readonly reconciliationId: string;
  readonly allReconciled: boolean;
  readonly summary: ReconciliationSummary;
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly reportHash: string;
}
```

The `reportHash` MUST match the hash computed in Section 3.7. An implementation MUST verify this before accepting an attestation.

---

## 4. Algorithms

### 4.1 Matching Algorithm

For each reconciliation dimension:

1. Collect records from both sides.
2. Correlate records using shared identifiers (`correlationId`, `intentId`, `txHash`).
3. For each correlated pair, compare amounts and assign a match status.
4. Records with no correlation partner are assigned `missing-*` or `unmatched`.

The matching algorithm MUST be deterministic: identical inputs MUST produce identical reports.

### 4.2 Amount Comparison

When comparing amounts across subsystems:

1. Normalize both amounts to the same decimal precision.
2. Compare as exact string equality after normalization.
3. Any difference, regardless of magnitude, MUST be reported as `amount-mismatch`.

---

## 5. Security Considerations

- **Report integrity**: The report hash provides tamper evidence. Modifying any field in the report changes the hash.
- **Non-deterministic hashing**: Implementations MUST use RFC 8785 canonicalization. Non-deterministic JSON serialization (e.g., random key ordering) will produce different hashes for identical reports.
- **Scope manipulation**: An adversary could scope reconciliation to exclude mismatched records. Attestations SHOULD include the scope parameters for auditor inspection.

---

## 6. Conformance

A conforming implementation:

1. MUST implement all three reconciliation dimensions.
2. MUST use the match status taxonomy defined in Section 3.2.
3. MUST compute report hashes using RFC 8785 + SHA-256.
4. MUST produce deterministic reports from identical inputs.
5. MUST verify report hash integrity before accepting attestations.

---

## 7. References

- [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- `packages/reconciler/src/types.ts` — ReconciliationReport, MatchStatus, AttestationRecord
- `packages/reconciler/src/reconciler.ts` — Reconciliation algorithm
- `packages/reconciler/src/attestor.ts` — Report hashing and attestation
