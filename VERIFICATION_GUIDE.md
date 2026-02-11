# Attestia — Auditor Verification Guide

Step-by-step guide for an independent auditor to verify Attestia's state integrity.

---

## Prerequisites

- Node.js 22+
- A running Attestia node (or the exported artifacts)
- `curl` or equivalent HTTP client

---

## Step 1: Export Events

Download the complete event log as NDJSON:

```bash
curl -H "X-Api-Key: YOUR_KEY" \
  http://localhost:3000/api/v1/export/events \
  -o events.ndjson
```

Each line is a JSON object with `{ event, streamId, version, globalPosition, appendedAt, hash, previousHash }`.

---

## Step 2: Export State Snapshot

Download the current state snapshot with GlobalStateHash:

```bash
curl -H "X-Api-Key: YOUR_KEY" \
  http://localhost:3000/api/v1/export/state \
  -o state.json
```

Response contains:
- `data.ledgerSnapshot` — all accounts and entries
- `data.registrumSnapshot` — all structural states and lineage
- `data.globalStateHash` — combined SHA-256 with per-subsystem hashes

---

## Step 3: Verify Hash Chain

Check that no events have been inserted, removed, or modified:

1. Parse each line of `events.ndjson`
2. For each event with a `hash` field:
   - Compute `SHA-256(canonicalize(event) + previousHash)`
   - Compare to the stored `hash`
   - The first event's `previousHash` should be `"genesis"`
3. Any mismatch indicates tampering

The system performs this automatically on startup via `verifyIntegrity()`.

---

## Step 4: Replay Verification

Independently compute the GlobalStateHash:

1. Load `state.json`
2. Restore a `Ledger` from `ledgerSnapshot` using `Ledger.fromSnapshot()`
3. Restore a `StructuralRegistrar` from `registrumSnapshot` using `StructuralRegistrar.fromSnapshot()`
4. Take fresh snapshots of both restored instances
5. Compute `GlobalStateHash` using RFC 8785 canonicalization + SHA-256
6. Compare your computed hash to `data.globalStateHash.hash`

If they match, the state is proven lossless and deterministic.

Programmatically, this is exactly what `verifyByReplay()` does:

```typescript
import { verifyByReplay } from "@attestia/verify";

const result = verifyByReplay({
  ledgerSnapshot: state.data.ledgerSnapshot,
  registrumSnapshot: state.data.registrumSnapshot,
  expectedHash: state.data.globalStateHash.hash,
});

console.log(result.verdict); // "PASS" or "FAIL"
```

---

## Step 5: Cross-Reference Audit Log

Query the audit log for all actions taken:

```bash
curl -H "X-Api-Key: YOUR_KEY" \
  http://localhost:3000/api/v1/attestations
```

Each attestation record contains:
- `reportHash` — SHA-256 of the reconciliation report
- `attestedAt` — timestamp of attestation
- `witnessRecord` — XRPL transaction details (if witness was available)

---

## Step 6: Verify On-Chain Witness Records

For each attestation with a `witnessRecord`:

1. Look up the XRPL transaction hash on the XRPL ledger
2. Decode the memo field (hex → UTF-8 JSON)
3. Compare the `reportHash` in the memo to the attestation's `reportHash`
4. Verify the transaction was signed by the expected witness account

---

## Verification Checklist

- [ ] Event hash chain is valid (no breaks, no gaps)
- [ ] GlobalStateHash matches after replay
- [ ] Ledger subsystem hash matches independently
- [ ] Registrum subsystem hash matches independently
- [ ] Attestation report hashes are consistent
- [ ] XRPL witness records match attestation records
- [ ] Audit log entries correspond to API actions
- [ ] No events exist after the snapshot timestamp (state is current)

---

## Automated Verification

Run the full test suite to verify all invariants programmatically:

```bash
pnpm test        # 1,107 tests
pnpm bench       # Performance within baselines
```

The `payroll-lifecycle.test.ts` performs an end-to-end verification of the complete flow.
