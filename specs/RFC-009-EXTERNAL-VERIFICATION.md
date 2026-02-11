# RFC-009: External Verification Protocol

**Status:** Draft
**Authors:** Attestia Team
**Created:** 2026-02-11
**Phase:** 12 — Institutionalization & Ecosystem Activation

## 1. Abstract

This RFC defines the protocol for external, independent verification of Attestia's operational integrity. It specifies the state bundle format, verifier node behavior, multi-verifier consensus, Merkle inclusion proofs, and the public API surface that enables third parties to verify Attestia's state without trusting the operator.

## 2. Motivation

Trust in a financial control system cannot rest solely on the operator's claims. External verifiers must be able to independently download the system's state, replay it, and confirm that the reported GlobalStateHash matches. This RFC establishes the mechanisms for trustless verification.

## 3. State Bundle Format

### 3.1 ExportableStateBundle

The state bundle is the portable verification artifact. It contains all information needed for independent verification:

```typescript
interface ExportableStateBundle {
  ledgerSnapshot: LedgerSnapshot;
  registrumSnapshot: RegistrumSnapshot;
  eventHashes: string[];
  globalStateHash: string;
  chainHashes: Record<string, string>;
  exportedAt: string;
  bundleHash: string;
}
```

### 3.2 Bundle Hash Computation

The `bundleHash` is computed as:

```
bundleHash = SHA-256(canonicalize({
  globalStateHash,
  eventHashes,
  chainHashes,
  exportedAt
}))
```

Where `canonicalize` uses RFC 8785 (JSON Canonicalization Scheme).

### 3.3 Integrity Verification

`verifyBundleIntegrity(bundle)` checks:

1. Recompute `bundleHash` from components — must match declared hash
2. Recompute `globalStateHash` from snapshots — must match declared hash
3. Verify all `chainHashes` are present and non-empty
4. Verify `eventHashes` array is consistent with event count

Any discrepancy causes verification to fail.

## 4. Verifier Node Protocol

### 4.1 Verification Process

A verifier node performs these steps:

1. **Download** the state bundle from `/public/v1/verify/state-bundle`
2. **Verify bundle integrity** — recompute all hashes
3. **Replay from snapshots** — reconstruct state from ledger and registrum snapshots
4. **Compare hashes** — each subsystem's replayed hash must match the bundle
5. **Produce report** — `VerifierReport` with verdict, per-subsystem checks, and discrepancies

### 4.2 VerifierReport

```typescript
interface VerifierReport {
  verifierId: string;
  verdict: "PASS" | "FAIL";
  bundleHash: string;
  subsystemChecks: SubsystemCheck[];
  discrepancies: string[];
  verifiedAt: string;
}

interface SubsystemCheck {
  subsystem: string;
  expectedHash: string;
  actualHash: string;
  passed: boolean;
}
```

### 4.3 Strict Mode

In strict mode (`strictMode: true`), verification fails if:
- Any chain hash is missing
- Any subsystem check produces a discrepancy
- The bundle is incomplete

In non-strict mode, missing optional data produces warnings but not failures.

## 5. Multi-Verifier Consensus

### 5.1 Consensus Algorithm

Given a set of verifier reports:

1. **Minimum threshold** — Consensus requires at least `minimumVerifiers` reports
2. **Majority rule** — If >50% of reports have verdict PASS, consensus is PASS
3. **Dissenter tracking** — Reports that disagree with consensus are recorded

### 5.2 ConsensusResult

```typescript
interface ConsensusResult {
  verdict: "PASS" | "FAIL" | "INSUFFICIENT";
  totalVerifiers: number;
  passCount: number;
  failCount: number;
  agreementPercentage: number;
  dissenters: string[];
  consensusReachedAt: string;
}
```

### 5.3 Insufficient Verifiers

If fewer than `minimumVerifiers` reports exist, the verdict is `INSUFFICIENT` and no consensus is declared.

## 6. Merkle Inclusion Proofs

### 6.1 Merkle Tree Construction

All event hashes are arranged in a binary Merkle tree:

- Leaves are pre-hashed (SHA-256 hex strings)
- Internal nodes: `SHA-256(leftChild + rightChild)`
- Odd leaf count: last leaf is duplicated
- Empty tree: null root

### 6.2 Inclusion Proof

A Merkle inclusion proof demonstrates that a specific event hash is part of the tree:

```typescript
interface MerkleProof {
  leafHash: string;
  siblings: Array<{ hash: string; direction: "left" | "right" }>;
  root: string;
}
```

Verification: starting from `leafHash`, iteratively hash with each sibling (respecting direction) until reaching the root.

### 6.3 Attestation Proof Package

A self-contained proof that a specific attestation was included in the event set:

```typescript
interface AttestationProofPackage {
  attestation: object;
  merkleRoot: string;
  inclusionProof: MerkleProof;
  timestamp: string;
  packageHash: string;
}
```

The `packageHash` = SHA-256(canonicalize(package without packageHash)). A third party can verify this package with NO access to the full event store.

## 7. Event Types

Three new domain events support external verification:

| Event Type | Payload | Trigger |
|------------|---------|---------|
| `verification.external.requested` | `{ bundleHash, requestedBy, requestedAt }` | State bundle downloaded |
| `verification.external.completed` | `{ verifierId, verdict, bundleHash, completedAt }` | Verifier report submitted |
| `verification.consensus.reached` | `{ verdict, verifierCount, agreementPct, reachedAt }` | Consensus threshold met |

## 8. Public API

All public endpoints require no authentication and are rate-limited per IP.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/v1/verify/state-bundle` | Download current state bundle |
| GET | `/public/v1/verify/health` | System hash + timestamp |
| POST | `/public/v1/verify/submit-report` | Submit verifier report |
| GET | `/public/v1/verify/consensus` | Current consensus status |
| GET | `/public/v1/verify/reports` | List submitted reports (paginated) |
| GET | `/public/v1/proofs/verify` | Verify a proof package |
| GET | `/public/v1/openapi.json` | OpenAPI 3.1 schema |

### 8.1 Rate Limiting

Public endpoints use IP-based token bucket rate limiting:
- 10 requests per minute per IP (stricter than internal API)
- `429 Too Many Requests` with `Retry-After` header on exhaustion

### 8.2 CORS

Public endpoints include CORS headers for browser-based verifier applications:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

## 9. Security Considerations

### 9.1 Verifier Collusion

Multiple verifiers may collude to produce false PASS verdicts. Mitigations:
- Require minimum verifier count from diverse parties
- Track verifier identity and history
- Cross-reference with on-chain attestations (XRPL witness records)

### 9.2 State Bundle Manipulation

The operator could serve a manipulated bundle. Mitigations:
- Bundle hash is deterministic — any change produces a different hash
- Cross-reference with previously published hashes (on-chain anchoring)
- Verifiers can compare bundles from different time periods

### 9.3 Proof Forgery

Merkle proofs are cryptographically bound to the tree root. Forging a proof requires:
- Finding a SHA-256 collision (computationally infeasible)
- Controlling the Merkle root (requires controlling the event store)

### 9.4 Replay Attacks

Old verifier reports cannot be replayed because:
- Reports include `bundleHash` which changes with every state update
- Reports include `verifiedAt` timestamp
- Consensus computation considers only reports for the current bundle

## 10. Implementation

| Component | Location |
|-----------|----------|
| State bundle | `packages/verify/src/state-bundle.ts` |
| Verifier node | `packages/verify/src/verifier-node.ts` |
| Consensus | `packages/verify/src/verification-consensus.ts` |
| Merkle tree | `packages/proof/src/merkle-tree.ts` |
| Attestation proofs | `packages/proof/src/attestation-proof.ts` |
| Public API | `packages/node/src/routes/public-verify.ts` |
| Proof API | `packages/node/src/routes/proofs.ts` |
| OpenAPI schema | `packages/node/src/routes/public-openapi.ts` |

## 11. References

- RFC-001: Deterministic Event Model
- RFC-004: Global State Hash
- RFC-005: Witness Protocol
- RFC-007: Multi-Signature Witness Protocol
- [RFC 8785: JSON Canonicalization Scheme](https://tools.ietf.org/html/rfc8785)
- [Merkle Trees in Bitcoin](https://en.bitcoin.it/wiki/Protocol_documentation#Merkle_Trees)
