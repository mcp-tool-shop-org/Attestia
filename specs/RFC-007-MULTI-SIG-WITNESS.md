# RFC-007: Multi-Signature Witness Protocol

**Status:** Draft
**Authors:** Attestia Team
**Created:** 2025-06-15
**Phase:** 11 — Multi-Chain Expansion

## 1. Abstract

This RFC defines the N-of-M multi-signature governance protocol for XRPL attestation witnessing. It extends the single-signer witness protocol (RFC-005) with event-sourced governance, canonical signing payloads, and quorum enforcement.

## 2. Governance Model

### 2.1 Event-Sourced State

Governance state is derived entirely from an ordered sequence of events:

- `signer_added` — New signer joins the governance set
- `signer_removed` — Signer leaves the governance set
- `quorum_changed` — Quorum threshold is modified
- `policy_rotated` — Audit marker for policy rotation

Replaying the same events always produces the same governance policy.

### 2.2 Governance Policy

A policy snapshot contains:

- **ID** — Deterministic SHA-256 hash of canonical(version, sorted signers, quorum)
- **Version** — Monotonically increasing integer
- **Signers** — List of (address, label, weight)
- **Quorum** — Minimum total weight required for approval

### 2.3 Weighted Voting

Each signer has a weight (default: 1). Quorum is expressed as minimum total weight, not minimum signer count. This allows configurations like:

- **3-of-5 equal**: 5 signers × weight 1, quorum = 3
- **Admin override**: 1 admin × weight 3 + 2 signers × weight 1, quorum = 3

## 3. Canonical Signing Payload

### 3.1 Payload Construction

The signing payload is constructed deterministically:

1. Extract: attestation hash, timestamp, policy ID, version, quorum, sorted signer addresses
2. Serialize with RFC 8785 (JCS) canonical JSON
3. SHA-256 hash the canonical bytes

Same attestation + same policy → same payload hash (always).

### 3.2 Signature Ordering

Signatures are ordered lexicographically by signer address before aggregation. This ensures deterministic ordering regardless of collection order.

## 4. Quorum Enforcement

### 4.1 Aggregation Rules

Before accepting a multi-signed attestation:

1. **No duplicates** — Each address appears at most once
2. **Policy membership** — Every signer must be in the governance policy
3. **Weight threshold** — Total weight of signatures ≥ quorum
4. **Fail closed** — Any violation → rejection, no partial submission

### 4.2 Security Properties

- **Replay protection** — Different attestation or policy → different payload hash
- **Policy rotation** — Adding/removing signers changes policy ID, invalidating old signatures
- **Downgrade prevention** — Quorum cannot exceed total weight; signer removal cannot make quorum impossible
- **Threshold integrity** — All quorum changes are captured as governance events

## 5. XRPL Multi-Sign Integration

### 5.1 Transaction Format

Multi-sig attestations use the same 1-drop self-send Payment with memo format as single-signer attestations. The only difference is the signing mechanism:

1. Build Payment transaction with attestation memo
2. Auto-fill sequence, fee, last ledger sequence
3. Each signer independently signs (XRPL multi-sign mode)
4. Combine signed blobs via `multisign()`
5. Submit combined transaction

### 5.2 Backward Compatibility

The `MultiSigWitness` falls back to single-signer mode when no governance configuration is provided. Existing verifiers work unchanged because the memo format is identical.

## 6. Registrum Integration

### 6.1 Authority Validation

Before accepting an attestation, validators check:

1. Policy ID matches the expected policy for the Registrum state
2. Policy version matches
3. Policy has at least one signer
4. Quorum is achievable (quorum ≤ total weight)

### 6.2 Historical Validation

For auditing past attestations:

1. Replay governance events up to the target version
2. Reconstruct the historical policy
3. Verify signatures against the historical policy
4. Confirm quorum was met at the time of signing

## 7. Security Considerations

- Event ordering is the security guarantee — shuffled events produce different state
- All governance changes are auditable via event history
- Removed signers cannot sign against the current policy
- Duplicate signer injection is rejected
- Zero-signature submission is rejected (fail closed)

## 8. Multi-Sig Witness Extension to RFC-005

Section 3.8 of RFC-005 is extended:

The witness protocol now supports both single-signer and multi-signer modes. Multi-signer mode uses event-sourced governance with N-of-M weighted quorum. The attestation payload format is unchanged; only the signing mechanism differs.
