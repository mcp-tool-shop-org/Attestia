# RFC-005: On-Chain Witness Protocol

**Status:** Draft
**Created:** 2026-02-11
**Author:** Attestia Working Group

---

## Abstract

This specification defines the On-Chain Witness Protocol used by Attestia to create immutable, timestamped proof of financial attestations on the XRP Ledger. It covers the attestation payload structure, XRPL memo encoding, witness record format, on-chain verification algorithm, retry semantics, and graceful degradation. A conforming implementation provides non-repudiable proof that a specific reconciliation result existed at a specific point in time.

---

## Status of This Document

Draft. This document is subject to revision before finalization.

---

## 1. Introduction

Attestations stored in a local database can be modified or deleted by the system operator. To provide independent proof, Attestia writes attestation hashes to the XRP Ledger as payment transaction memos. Once validated in a ledger, these records are immutable and publicly verifiable.

The witness protocol is designed for resilience: if the XRPL network is unreachable, the system degrades gracefully rather than blocking financial operations.

---

## 2. Terminology

All terms are defined in [DEFINITIONS.md](DEFINITIONS.md). Key terms:

- **Witness**, **Witness Record**, **Attestation Payload**
- **Attestation**, **Reconciliation Report**

Additional terms:

- **XRPL**: The XRP Ledger, a decentralized public blockchain.
- **Memo**: An XRPL transaction field that carries arbitrary data (hex-encoded).
- **Drops**: The smallest unit of XRP (1 XRP = 1,000,000 drops).

---

## 3. Specification

### 3.1 Attestation Payload

The content-addressed data structure that gets encoded as an XRPL memo:

```typescript
interface AttestationPayload {
  readonly hash: string;
  readonly timestamp: string;
  readonly source: AttestationSource;
  readonly summary: PayloadSummary;
}
```

- `hash`: SHA-256 of the canonical payload content (excluding the hash field itself).
- `timestamp`: ISO 8601 timestamp of payload creation.
- `source`: Origin of the attestation (Section 3.2).
- `summary`: Quick-verification data (Section 3.3).

### 3.2 Attestation Source

```typescript
type AttestationSource =
  | { kind: "reconciliation"; reportId: string; reportHash: string }
  | { kind: "registrum"; stateId: string; orderIndex: number };
```

- **Reconciliation source**: References a reconciliation report by ID and hash.
- **Registrum source**: References a structural state by ID and order index.

### 3.3 Payload Summary

```typescript
interface PayloadSummary {
  readonly clean: boolean;
  readonly matchedCount: number;
  readonly mismatchCount: number;
  readonly missingCount: number;
  readonly attestedBy: string;
}
```

`clean` MUST be `true` if and only if `mismatchCount === 0` and `missingCount === 0`.

### 3.4 XRPL Memo Encoding

The attestation payload is encoded as an XRPL transaction memo:

```typescript
interface XrplMemo {
  readonly MemoType: string;
  readonly MemoData: string;
  readonly MemoFormat?: string;
}
```

Encoding procedure:

1. Serialize the attestation payload as JSON.
2. Convert the JSON string to hexadecimal for `MemoData`.
3. Set `MemoType` to the hex encoding of `"attestia/witness/v1"`.
4. OPTIONALLY set `MemoFormat` to the hex encoding of `"application/json"`.

All memo fields MUST be hex-encoded per XRPL convention.

### 3.5 Witness Transaction

The witness is submitted as an XRPL Payment transaction:

- **TransactionType**: `Payment`
- **Account**: The witness account address
- **Destination**: The witness account address (self-payment)
- **Amount**: Minimum value (e.g., `"1"` drop)
- **Memos**: Array containing the encoded memo from Section 3.4

The self-payment pattern uses the minimum possible amount to record data on-chain at minimal cost.

### 3.6 Witness Record

After successful submission, a witness record is created:

```typescript
interface WitnessRecord {
  readonly id: string;
  readonly payload: AttestationPayload;
  readonly chainId: string;
  readonly txHash: string;
  readonly ledgerIndex: number;
  readonly witnessedAt: string;
  readonly witnessAccount: string;
}
```

- `chainId`: XRPL chain identifier (e.g., `"xrpl:testnet"`, `"xrpl:mainnet"`).
- `txHash`: XRPL transaction hash.
- `ledgerIndex`: Ledger sequence number where the transaction was validated.
- `witnessAccount`: The r-address of the signing account.

### 3.7 Witness Configuration

```typescript
interface WitnessConfig {
  readonly rpcUrl: string;
  readonly chainId: string;
  readonly account: string;
  readonly secret: string;
  readonly feeDrops?: string;
  readonly timeoutMs?: number;
  readonly retry?: RetryConfig;
}
```

The `secret` field contains the witness account's signing key. Implementations SHOULD use a key provider abstraction in production rather than plaintext secrets.

---

## 4. Algorithms

### 4.1 On-Chain Verification

To verify a witness record against on-chain data:

1. Fetch the transaction by hash from the XRPL.
2. Extract the memo field from the transaction.
3. Decode `MemoData` from hexadecimal to UTF-8 JSON.
4. Parse the JSON as an `AttestationPayload`.
5. Compare the `reportHash` in the payload to the expected `reportHash`.
6. Verify the transaction was signed by the expected witness account.

If all checks pass, the witness is verified.

### 4.2 Retry Semantics

When XRPL submission fails, the implementation SHOULD retry with exponential backoff:

```
delay(attempt) = min(baseDelay * 2^attempt + random(0, jitter), maxDelay)
```

Default configuration:

| Parameter | Default |
|-----------|---------|
| Max attempts | 3 |
| Base delay | 1,000 ms |
| Max delay | 30,000 ms |
| Jitter | 200 ms |

### 4.3 Retry Classification

Not all errors are retryable:

| Error Type | Retry? | Rationale |
|------------|--------|-----------|
| Network timeout | Yes | Transient connectivity issue |
| Connection refused | Yes | Server temporarily unavailable |
| `tecUNFUNDED_PAYMENT` | No | Permanent: account lacks funds |
| `temBAD_FEE` | No | Permanent: invalid fee |
| `tefPAST_SEQ` | No | Permanent: sequence number conflict |

An implementation MUST NOT retry permanent XRPL errors.

### 4.4 Graceful Degradation

When all retry attempts are exhausted:

1. The witness submission MUST fail with a structured error containing:
   - Number of attempts made
   - The last error encountered
   - The payload that failed to submit

2. The attestation MUST still be recorded locally. The absence of an on-chain witness does not invalidate the attestation — it reduces the non-repudiation guarantee.

3. The system MUST report degraded witness status via health checks and metrics.

---

## 5. Security Considerations

- **Non-repudiation**: Once a witness transaction is validated on the XRPL, it cannot be modified or deleted. This provides time-stamped proof of attestation.
- **Witness account compromise**: If the witness account's signing key is compromised, an adversary can submit false attestations. Multi-sig witness governance (future RFC) mitigates this.
- **Secret management**: The witness secret MUST be protected. Implementations SHOULD use environment variables, key vaults, or HSMs rather than configuration files.
- **Self-payment pattern**: The self-payment avoids transferring value to third parties. The 1-drop minimum is economically negligible.
- **Memo visibility**: XRPL memos are publicly visible. The attestation payload contains hashes, not raw financial data.

---

## 6. Conformance

A conforming implementation:

1. MUST encode attestation payloads as specified in Section 3.4.
2. MUST use the self-payment transaction pattern from Section 3.5.
3. MUST implement on-chain verification as specified in Section 4.1.
4. MUST distinguish between retryable and permanent errors as specified in Section 4.3.
5. MUST degrade gracefully when XRPL is unreachable as specified in Section 4.4.
6. MUST NOT block financial operations when the witness is unavailable.

---

## 7. References

- [XRPL Documentation — Payment Transaction](https://xrpl.org/payment.html)
- [XRPL Documentation — Transaction Memos](https://xrpl.org/transaction-common-fields.html#memos-field)
- `packages/witness/src/types.ts` — AttestationPayload, XrplMemo, WitnessRecord
- `packages/witness/src/submitter.ts` — XRPL submission logic
- `packages/witness/src/memo-encoder.ts` — Memo encoding/decoding
- `packages/witness/src/retry.ts` — Retry with exponential backoff
- `packages/witness/src/verifier.ts` — On-chain verification
