# Attestia Security Remediation — Phase 2 Handoff

**Audit date:** 2026-03-20
**Phase 1 shipped:** commit `0528a99` (8 fixes, 1,853/1,853 tests pass, CI green)
**This document:** Everything remaining, ordered by priority, with exact file:line references and fix instructions.

**Rules:**
- Every fix MUST include tests for the code it touches
- `pnpm build && pnpm test` must pass after each fix
- Commit each fix individually — don't batch
- Push after each commit and verify CI passes (`gh run list --limit 1`)

---

## CRITICAL (fix before any production deployment)

### C1. Event-Store: JSONL concurrent append race condition
**Files:**
- `packages/event-store/src/jsonl-store.ts:107` — `_nextGlobalPosition` field
- `packages/event-store/src/jsonl-store.ts:188` — `this._nextGlobalPosition++` (unsynchronized)
- `packages/event-store/src/jsonl-store.ts:458-466` — `_writeAndSync()` uses `openSync("a")` without file locking

**Problem:** Two processes calling `append()` simultaneously can:
1. Read the same `_nextGlobalPosition` → duplicate global positions
2. Interleave writes to the JSONL file → corrupted records
3. Set `_lastHash` out of order → broken hash chain

**Fix approach (pick one):**
- **Option A (minimal):** Add advisory file locking via `fs.flockSync()` or a lockfile (`<path>.lock`) around the entire append+write+sync sequence. Wrap in try/finally to release lock.
- **Option B (recommended):** Migrate persistence to SQLite with WAL mode. The `in-memory-store.ts` stays as-is; only `jsonl-store.ts` changes. SQLite handles concurrency, ACID, and fsync natively.

**Tests to add:** Concurrent append test — spawn 2+ async append calls in the same tick and verify global positions are unique and hash chain verifies.

---

### C2. Witness: Plaintext XRPL secrets in memory
**Files:**
- `packages/witness/src/types.ts:141` — `readonly secret: string;` in `WitnessConfig`
- `packages/witness/src/governance/multisig-submitter.ts:114` — `Wallet.fromSeed(signer.secret)` — secret extracted but never cleared

**Problem:** XRPL wallet seeds stored as plain strings. Accessible via process memory dumps, core dumps, or debugger attachment. The config object retains the secret indefinitely after wallet construction.

**Fix:**
1. Create a `SecretProvider` interface:
```typescript
export interface SecretProvider {
  getSecret(address: string): Promise<string>;
}
```
2. Change `WitnessConfig.secret` to accept `string | SecretProvider`
3. In `submitter.ts` and `multisig-submitter.ts`, resolve the secret via the provider, use it for signing, then discard the reference
4. Default implementation: `InlineSecretProvider` wraps a plain string (backward compatible)
5. Document that production deployments should use a vault-backed provider (e.g., HashiCorp Vault, AWS Secrets Manager)

**Tests to add:** Test that `SecretProvider` interface is called during signing, test that `InlineSecretProvider` works identically to current behavior.

---

## HIGH (fix this sprint)

### H1. Verification consensus: No minimum quorum
**File:** `packages/verify/src/verification-consensus.ts:76-77`
```typescript
const verdict: VerificationVerdict =
  passCount > total / 2 ? "PASS" : "FAIL";
```

**Problem:** If only 1 verifier submits and passes, consensus is PASS. A compromised single verifier can approve anything.

**Fix:** Add `minimumVerifiers` parameter (default: 1 for backward compatibility, but callers should set it higher). If `reports.length < minimumVerifiers`, return FAIL with `quorumReached: false`.

**Tests to add:** Test that 1 report with `minimumVerifiers=3` returns FAIL. Test that 3/3 PASS with `minimumVerifiers=3` returns PASS.

---

### H2. Solana retry logic: dead code
**Files:**
- `packages/chain-observer/src/solana/rpc-config.ts:42,48` — `maxRetries` and `retryDelayMs` defined
- `packages/chain-observer/src/solana/solana-observer.ts` — these fields are **never read**

**Problem:** Solana RPC calls have no retry logic. Network blips cause immediate failures.

**Fix:** Create a `withRetry<T>(fn: () => Promise<T>, config: { maxRetries: number; delayMs: number }): Promise<T>` helper with exponential backoff. Wrap all RPC calls in `solana-observer.ts` (getBalance at ~line 146, getTokenBalance at ~line 168, getTransfers at ~line 230) with this helper, reading `rpcConfig.maxRetries` and `rpcConfig.retryDelayMs`.

**Tests to add:** Test retry on transient RPC failure (mock Connection to fail N-1 times then succeed). Test that non-retryable errors propagate immediately.

---

### H3. XRPL transaction idempotency not enforced
**File:** `packages/witness/src/submitter.ts:162` — `client.submitAndWait(signed.tx_blob)`

**Problem:** If `submitAndWait` succeeds but the network response is lost (timeout), the retry logic resubmits the same transaction. XRPL may confirm both, creating duplicate on-chain attestations.

**Fix:** Before submission, compute and store the transaction hash (from the signed blob). On retry, first check if that tx hash is already confirmed on-chain via `client.request({ command: "tx", transaction: txHash })`. If confirmed, return the existing result instead of resubmitting.

**Tests to add:** Test that a "tx already confirmed" scenario returns the existing witness record without resubmission.

---

### H4. Multi-sig signatures not verified against transaction hash
**File:** `packages/witness/src/governance/multisig-submitter.ts:202` — `aggregateSignatures(signerSignatures, policy, payloadHash)`

**Problem:** Signatures are collected and quorum is checked, but the actual cryptographic signatures are never verified to match the transaction being signed. A corrupted wallet could produce an invalid signature that passes quorum checks.

**Fix:** After collecting signatures and before submission, verify each `signed.hash` matches the expected signing payload. The `xrpl` library's `verify()` function can check this. Add a validation step between signing and `multisign()`.

**Tests to add:** Test that a tampered signature blob is rejected before submission. Test that valid multi-sig passes verification.

---

### H5. Attestor lastStateId race condition
**File:** `packages/reconciler/src/attestor.ts:20,76`
```typescript
private lastStateId: string | null = null;
// ...
this.lastStateId = result.stateId;
```

**Problem:** If two concurrent `attest()` calls race, `lastStateId` may be set out-of-order, breaking the lineage assumption that each attestation points to its predecessor.

**Fix:** Add a mutex/semaphore around the `attest()` method. A simple approach:
```typescript
private attestLock: Promise<void> = Promise.resolve();

async attest(report: ReconciliationReport): Promise<AttestationRecord> {
  const release = this.acquireLock();
  try {
    // ... existing logic ...
  } finally {
    release();
  }
}
```
Or use a lightweight async mutex library.

**Tests to add:** Test that two concurrent `attest()` calls produce correct lineage (second attestation's `parentStateId` equals first attestation's `stateId`).

---

### H6. SDK: Unvalidated JSON response parsing (deserialization bombs)
**File:** `packages/sdk/src/http-client.ts:39-49` — `parseResponseBody()`

**Problem:** No response body size limit. A malicious server can return a multi-GB JSON payload or deeply nested object, causing memory exhaustion.

**Fix:**
```typescript
async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return {};
  if (text.length > 10_000_000) {
    throw new AttestiaError("RESPONSE_TOO_LARGE", "Response body exceeds 10MB limit", 0);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AttestiaError("INVALID_JSON", "Failed to parse response body", 0);
  }
}
```

Also validate `Content-Type: application/json` before parsing.

**Tests to add:** Test that a 10MB+ response throws `RESPONSE_TOO_LARGE`. Test that non-JSON content-type throws `INVALID_JSON`.

---

### H7. JWT role not validated against server-side registry
**File:** `packages/node/src/middleware/auth.ts:214-217`

**Problem:** JWT role is accepted at face value from the token claims. If the JWT secret is compromised, an attacker can forge admin tokens for any tenant.

**Fix:** Add an optional `roleValidator` callback to `AuthConfig`:
```typescript
readonly roleValidator?: (claims: JwtClaims) => boolean;
```
If provided, call it after signature verification. This allows server-side role registry checks (e.g., verify tenant membership, check revocation list).

**Tests to add:** Test that a JWT with valid signature but rejected by roleValidator returns 401. Test backward compatibility when roleValidator is not provided.

---

### H8. Metrics endpoint unauthenticated
**File:** `packages/node/src/routes/metrics.ts:16` — route mounted without auth
**File:** `packages/node/src/app.ts:118-120` — mounted at root level, outside the `/api/*` auth scope

**Problem:** `/metrics` endpoint exposes request counts, latencies, and business metrics to any client. Enables reconnaissance.

**Fix:** Add an optional `metricsAuth` config to `CreateAppOptions`. When provided, wrap the metrics route with auth middleware. When not provided, keep current behavior (backward compatible for dev).

**Tests to add:** Test that `/metrics` returns 401 when metricsAuth is configured. Test that it works without auth when not configured.

---

### H9. Registrum: Root state validation gap
**File:** `packages/registrum/src/invariants.ts:58` — `isRootState()` checks `structure["isRoot"] === true`

**Problem:** The `lineageExplicitInvariant` (B.1) allows transitions with `from === null` OR `isRoot === true` independently. A transition can claim to be root without `structure.isRoot`, or have no parent without declaring root status.

**Fix:** Add a new invariant or strengthen B.1:
- Root states (`from === null`) MUST have `structure.isRoot === true`
- Non-root states (`from !== null`) MUST NOT have `structure.isRoot === true`

**Tests to add:** Test that a transition with `from: null` but missing `isRoot` is rejected. Test that a transition with `from: "parent-id"` and `isRoot: true` is rejected.

---

### H10. Proof: Leaf hash not validated during proof verification
**File:** `packages/proof/src/merkle-tree.ts:229` — `verifyProof()` uses `proof.leafHash` without format validation

**Problem:** `verifyProof()` accepts any string as `leafHash`. Non-hex strings, wrong lengths, or empty strings silently produce invalid hashes that happen to not match the root (returning false) — but the error is not caught at the right layer.

**Fix:** Add `assertValidSha256Hex()` calls at the start of `verifyProof()`:
```typescript
static verifyProof(proof: MerkleProof): boolean {
  assertValidSha256Hex(proof.leafHash, "proof.leafHash");
  assertValidSha256Hex(proof.root, "proof.root");
  for (let i = 0; i < proof.siblings.length; i++) {
    assertValidSha256Hex(proof.siblings[i]!.hash, `proof.siblings[${i}]`);
  }
  // ... existing logic ...
}
```

**Tests to add:** Test that verifyProof throws on non-hex leafHash. Test that verifyProof throws on wrong-length root. Test that valid proofs still pass.

---

## MEDIUM (fix before GA)

### M1. Idempotency key: No body hash comparison
**File:** `packages/node/src/middleware/idempotency.ts:92`

**Problem:** Cached response is returned based solely on idempotency key match, without verifying the request body matches the original request. Two different POST bodies with the same key return the first response → cache poisoning.

**Fix:** When storing a cached response, also store `SHA-256(requestBody)`. When retrieving, compare the body hash. If mismatched, return 422 with `"Idempotency key reuse with different request body"`.

**Tests to add:** Test same key + same body returns cached response. Test same key + different body returns 422.

---

### M2. Error messages leak internal details
**File:** `packages/node/src/middleware/error-handler.ts:96-97`

**Problem:** Non-500 errors return the full domain error message, which may contain business logic details, database state, or configuration hints.

**Fix:** For 4xx errors, return only the error code and a generic message. Log the full message server-side. Example:
```typescript
const message = status >= 500
  ? "Internal server error"
  : (domainError.code ?? "Request failed");
```

**Tests to add:** Test that a domain error with sensitive message returns generic response. Test that 500 errors return "Internal server error".

---

### M3. Open CORS on public endpoints
**File:** `packages/node/src/routes/public-verify.ts:76-84` — `origin: "*"`, `maxAge: 86400`

**Problem:** Wildcard CORS with 24-hour preflight cache enables cross-origin report injection.

**Fix:** Make CORS origin configurable via `CreateAppOptions`. Default to a restrictive list or `origin: false`. Reduce `maxAge` to 3600 (1 hour).

**Tests to add:** Test that CORS headers reflect configured origins. Test that unconfigured origin is rejected.

---

### M4. Missing security headers
**File:** `packages/node/src/app.ts` — no security headers middleware

**Fix:** Add global middleware after `requestIdMiddleware()`:
```typescript
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Content-Security-Policy", "default-src 'none'");
  c.header("Referrer-Policy", "no-referrer");
});
```

**Tests to add:** Test that any response includes the security headers.

---

### M5. Snapshot directory sanitization collision
**File:** `packages/event-store/src/snapshot-store.ts:287`
```typescript
const safe = streamId.replace(/[^a-zA-Z0-9_.-]/g, "_");
```

**Problem:** `stream:a` and `stream/a` both become `stream_a` → snapshot collision.

**Fix:** Use SHA-256 hash of the stream ID as directory name:
```typescript
const safe = createHash("sha256").update(streamId).digest("hex").slice(0, 32);
```
Keep a `_manifest.json` mapping hash→streamId for debugging.

**Tests to add:** Test that two stream IDs differing only in special characters get separate directories.

---

### M6. Event migrations not atomic
**File:** `packages/event-store/src/catalog.ts:239-247`

**Problem:** If migration v1→v2 succeeds but v2→v3 fails, the payload is partially migrated. The caller receives malformed data.

**Fix:** Clone the payload before migration. Apply all migrations to the clone. Only return the result if all succeed. On failure, throw with the original payload intact:
```typescript
let current = structuredClone(payload);
```

**Tests to add:** Test that a failing migration at step 2/3 preserves the original payload. Test that successful multi-step migration returns the fully migrated payload.

---

### M7. XRPL memo size not validated
**File:** `packages/witness/src/memo-encoder.ts:32-40`

**Problem:** `encodeMemo()` converts payload to JSON→hex without checking size against XRPL's 256 KB memo limit. Large payloads fail at transaction submission time with an unhelpful error.

**Fix:** After hex encoding, check size:
```typescript
const hexData = toHex(payloadJson);
if (hexData.length > 512 * 1024) { // 256KB in hex = 512K chars
  throw new Error(`Memo payload too large: ${hexData.length / 2} bytes (max 256KB)`);
}
```

**Tests to add:** Test that a payload exceeding 256KB throws before submission. Test that normal-sized payloads pass.

---

### M8. SDK: No total request deadline across retries
**File:** `packages/sdk/src/http-client.ts:242-251` — retry loop

**Problem:** Each retry has its own timeout, but cumulative wait = `timeout × maxRetries`. With defaults (30s × 3), client blocks for up to 90 seconds.

**Fix:** Add a `requestDeadline = Date.now() + this.timeout` at the start of the request method. Before each retry, check `Date.now() < requestDeadline`. Use `Math.min(remainingMs, perAttemptTimeout)` for each attempt.

**Tests to add:** Test that total request time doesn't exceed timeout regardless of retries. Test that remaining time decreases across retries.

---

## LOW (track and schedule)

### L1. Token metadata cache unbounded — `packages/chain-observer/src/evm/evm-observer.ts:397`
Add LRU eviction or max cache size (e.g., 1000 entries).

### L2. Solana SPL token symbol fallback — `packages/chain-observer/src/solana/solana-observer.ts:199,345`
`mint?.slice(0, 8)` as symbol is misleading. Fetch real SPL metadata on-chain or use a known-tokens registry.

### L3. Snapshot integrity hash has no algorithm versioning — `packages/event-store/src/snapshot-store.ts:39-41`
Add `hashAlgorithm: "sha256"` field to snapshots for future-proofing.

### L4. No loaded snapshot structure validation — `packages/event-store/src/snapshot-store.ts:323-329`
`JSON.parse()` as `StoredSnapshot` without field validation. Add Zod schema or manual field checks.

### L5. Subscription handlers called synchronously without error handling — `packages/event-store/src/in-memory-store.ts:289-306`, `packages/event-store/src/jsonl-store.ts:468-483`
Wrap handler calls in try-catch so one misbehaving subscriber can't block others.

### L6. Hash chain verification cascading errors — `packages/event-store/src/hash-chain.ts:70-136`
After finding the first break, continue verification with the actual (not expected) hash to distinguish primary break from cascading failures.

### L7. No audit log API endpoint — `packages/node/src/services/audit-log.ts:52-76`
Expose `/api/v1/audit-logs` with tenant-scoped filtering and `requirePermission("read")`.

### L8. No differential rate limiting (read vs write) — `packages/node/src/middleware/rate-limit.ts:99-122`
POST endpoints should cost more tokens than GET endpoints.

### L9. No pagination cursor format validation — `packages/node/src/routes/attestation.ts:94`, `packages/node/src/routes/intents.ts:88`
Validate cursor format (alphanumeric, max length) before passing to `paginate()`.

### L10. Type guards don't validate optional fields — `packages/types/src/guards.ts:50-61`
`isLedgerEntry()` doesn't check `intentId?` and `txHash?` types when present. Add `(v.intentId === undefined || typeof v.intentId === "string")`.

---

## Verification Checklist

After all fixes:
```bash
pnpm build                    # All 14 packages compile
pnpm test                     # All tests pass (should be > 1,853 with new tests)
pnpm typecheck                # No type errors
gh run list --limit 1         # CI green
```

## Reference

- **Repo:** https://github.com/mcp-tool-shop-org/Attestia
- **Phase 1 commit:** `0528a99` (2026-03-20)
- **Test count baseline:** 1,853
- **Packages:** types, registrum, ledger, chain-observer, vault, treasury, reconciler, witness, verify, event-store, proof, sdk, node, demo
