/**
 * Standalone rippled integration tests.
 *
 * Requires a standalone rippled node running via Docker:
 *   docker compose up -d
 *
 * Tests the full round-trip:
 *   build payload → encode memo → submit tx → close ledger → fetch tx → decode → verify hash
 *
 * In standalone mode, the genesis account (rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh)
 * has 100B XRP and the master seed is "snoPBrXtMeMyMHUVTgbuqAfg1SUTb" (well-known).
 *
 * Skips gracefully if rippled is not running.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client as XrplClient, Wallet } from "xrpl";
import type { Payment } from "xrpl";
import {
  buildReconciliationPayload,
  buildRegistrumPayload,
  verifyPayloadHash,
  encodeMemo,
  decodeMemo,
  isAttestiaMemo,
  fromHex,
  MEMO_TYPE,
} from "../../src/index.js";
import type {
  AttestationPayload,
  WitnessConfig,
  XrplMemo,
} from "../../src/types.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

// =============================================================================
// Standalone rippled configuration
// =============================================================================

/** Well-known genesis account for standalone rippled */
const GENESIS_ACCOUNT = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const GENESIS_SEED = "snoPBrXtMeMyMHUVTgbuqAfg1SUTb";

/** WebSocket endpoint for standalone rippled (Docker Compose maps port 6006) */
const RIPPLED_WS = "ws://localhost:6006";

/** Admin RPC endpoint (for ledger_accept) */
const RIPPLED_ADMIN = "http://localhost:5005";

// =============================================================================
// Test helpers
// =============================================================================

/** Check if standalone rippled is reachable */
async function isRippledAvailable(): Promise<boolean> {
  try {
    const client = new XrplClient(RIPPLED_WS, { timeout: 3_000 });
    await client.connect();
    const info = await client.request({ command: "server_info" });
    await client.disconnect();
    // Standalone mode shows "standalone" in server_state or has no peers
    const serverState = info.result.info.server_state;
    return serverState !== undefined;
  } catch {
    return false;
  }
}

/**
 * Advance the ledger in standalone mode by calling ledger_accept via admin RPC.
 * In standalone mode, ledgers don't close automatically — this triggers a close.
 */
async function advanceLedger(client: XrplClient): Promise<void> {
  await client.request({ command: "ledger_accept" } as never);
}

/**
 * Submit a transaction and advance the ledger in standalone mode.
 * Unlike submitAndWait (which blocks forever in standalone), this:
 * 1. Submits the tx blob
 * 2. Advances the ledger via ledger_accept
 * 3. Returns the tx hash
 */
async function submitAndClose(
  client: XrplClient,
  txBlob: string,
): Promise<{ hash: string; ledgerIndex: number }> {
  const submitResult = await client.request({
    command: "submit",
    tx_blob: txBlob,
  });

  const engineResult = (submitResult.result as Record<string, unknown>).engine_result as string;
  if (engineResult !== "tesSUCCESS") {
    throw new Error(`Submit failed: ${engineResult}`);
  }

  const txHash = (submitResult.result as Record<string, unknown>).tx_json as Record<string, unknown>;
  const hash = txHash.hash as string;

  // Close the ledger to validate the transaction
  await advanceLedger(client);

  // Fetch the validated tx to get ledger_index
  const txResponse = await client.request({
    command: "tx",
    transaction: hash,
    binary: false,
  });

  const ledgerIndex = (txResponse.result as Record<string, unknown>).ledger_index as number ?? 0;

  return { hash, ledgerIndex };
}

function makeReport(): ReconciliationReport {
  return {
    id: "recon-integration-1",
    scope: { from: "2024-01-01T00:00:00Z", to: "2024-01-31T23:59:59Z" },
    timestamp: "2024-02-01T00:00:00Z",
    intentLedgerMatches: [],
    ledgerChainMatches: [],
    intentChainMatches: [],
    summary: {
      totalIntents: 10,
      totalLedgerEntries: 20,
      totalChainEvents: 8,
      matchedCount: 10,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
  };
}

function makeAttestation(): AttestationRecord {
  return {
    id: "att:recon-integration-1",
    reconciliationId: "recon-integration-1",
    allReconciled: true,
    summary: {
      totalIntents: 10,
      totalLedgerEntries: 20,
      totalChainEvents: 8,
      matchedCount: 10,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
    attestedBy: "integration-test",
    attestedAt: "2024-02-01T00:00:01Z",
    reportHash: "integration-hash-256",
  };
}

// =============================================================================
// Tests
// =============================================================================

let client: XrplClient;
let wallet: Wallet;
let available = false;

beforeAll(async () => {
  available = await isRippledAvailable();
  if (!available) return;

  client = new XrplClient(RIPPLED_WS, { timeout: 10_000 });
  await client.connect();
  wallet = Wallet.fromSeed(GENESIS_SEED);

  // Advance a couple of ledgers to get past the initial state
  await advanceLedger(client);
  await advanceLedger(client);
});

afterAll(async () => {
  if (client?.isConnected()) {
    await client.disconnect();
  }
});

describe("XRPL Standalone Integration", () => {
  it.skipIf(!available)("connects to standalone rippled", async () => {
    const info = await client.request({ command: "server_info" });
    expect(info.result.info.build_version).toBeTruthy();
  });

  it.skipIf(!available)("genesis account has XRP", async () => {
    const info = await client.request({
      command: "account_info",
      account: GENESIS_ACCOUNT,
    });
    const balance = info.result.account_data.Balance;
    expect(BigInt(balance)).toBeGreaterThan(0n);
  });

  it.skipIf(!available)("submits attestation memo and reads it back", async () => {
    const payload = buildReconciliationPayload(makeReport(), makeAttestation());
    const memo = encodeMemo(payload);

    // Build the payment transaction
    const tx: Payment = {
      TransactionType: "Payment",
      Account: GENESIS_ACCOUNT,
      Destination: GENESIS_ACCOUNT, // Self-send
      Amount: "1", // 1 drop
      Memos: [
        {
          Memo: {
            MemoType: memo.MemoType,
            MemoData: memo.MemoData,
            ...(memo.MemoFormat ? { MemoFormat: memo.MemoFormat } : {}),
          },
        },
      ],
    };

    // Autofill, sign, submit, close ledger
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await submitAndClose(client, signed.tx_blob);

    expect(result.hash).toBeTruthy();
    expect(result.hash).toHaveLength(64); // SHA-512Half

    // Read the transaction back from the ledger
    const txResponse = await client.request({
      command: "tx",
      transaction: result.hash,
      binary: false,
    });

    const txData = txResponse.result as unknown as Record<string, unknown>;
    const memos = txData.Memos as readonly { Memo: XrplMemo }[];

    expect(memos).toBeDefined();
    expect(memos.length).toBeGreaterThanOrEqual(1);

    // Find our attestation memo
    const attestiaMemo = memos.find((m) => isAttestiaMemo(m.Memo));
    expect(attestiaMemo).toBeDefined();

    // Decode and verify
    const decoded = decodeMemo(attestiaMemo!.Memo);
    expect(decoded.hash).toBe(payload.hash);
    expect(decoded.source.kind).toBe("reconciliation");
    expect(decoded.summary.clean).toBe(true);
    expect(decoded.summary.matchedCount).toBe(10);
    expect(decoded.summary.attestedBy).toBe("integration-test");

    // Verify content hash is self-consistent
    expect(verifyPayloadHash(decoded)).toBe(true);
  });

  it.skipIf(!available)("memo type is correctly set on-chain", async () => {
    const payload = buildRegistrumPayload("state-integ-1", 0, "registrar-test");
    const memo = encodeMemo(payload);

    const tx: Payment = {
      TransactionType: "Payment",
      Account: GENESIS_ACCOUNT,
      Destination: GENESIS_ACCOUNT,
      Amount: "1",
      Memos: [
        {
          Memo: {
            MemoType: memo.MemoType,
            MemoData: memo.MemoData,
            ...(memo.MemoFormat ? { MemoFormat: memo.MemoFormat } : {}),
          },
        },
      ],
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await submitAndClose(client, signed.tx_blob);

    const txResponse = await client.request({
      command: "tx",
      transaction: result.hash,
      binary: false,
    });

    const txData = txResponse.result as unknown as Record<string, unknown>;
    const memos = txData.Memos as readonly { Memo: XrplMemo }[];
    const onChainMemoType = fromHex(memos[0].Memo.MemoType);

    expect(onChainMemoType).toBe(MEMO_TYPE);
  });

  it.skipIf(!available)("detects tampered payload hash on verification", async () => {
    const payload = buildReconciliationPayload(makeReport(), makeAttestation());

    // Tamper with the hash before we would normally verify
    const tampered: AttestationPayload = {
      ...payload,
      hash: "0".repeat(64),
    };

    // The tampered payload should fail hash verification
    expect(verifyPayloadHash(tampered)).toBe(false);
    // The original should pass
    expect(verifyPayloadHash(payload)).toBe(true);
  });

  it.skipIf(!available)("multiple attestations produce distinct tx hashes", async () => {
    const payload1 = buildReconciliationPayload(makeReport(), makeAttestation());
    const payload2 = buildRegistrumPayload("state-integ-2", 1, "registrar-test-2");

    const memo1 = encodeMemo(payload1);
    const memo2 = encodeMemo(payload2);

    // Submit two separate transactions
    const tx1: Payment = {
      TransactionType: "Payment",
      Account: GENESIS_ACCOUNT,
      Destination: GENESIS_ACCOUNT,
      Amount: "1",
      Memos: [{ Memo: { MemoType: memo1.MemoType, MemoData: memo1.MemoData, ...(memo1.MemoFormat ? { MemoFormat: memo1.MemoFormat } : {}) } }],
    };

    const tx2: Payment = {
      TransactionType: "Payment",
      Account: GENESIS_ACCOUNT,
      Destination: GENESIS_ACCOUNT,
      Amount: "1",
      Memos: [{ Memo: { MemoType: memo2.MemoType, MemoData: memo2.MemoData, ...(memo2.MemoFormat ? { MemoFormat: memo2.MemoFormat } : {}) } }],
    };

    const prepared1 = await client.autofill(tx1);
    const signed1 = wallet.sign(prepared1);
    const result1 = await submitAndClose(client, signed1.tx_blob);

    const prepared2 = await client.autofill(tx2);
    const signed2 = wallet.sign(prepared2);
    const result2 = await submitAndClose(client, signed2.tx_blob);

    expect(result1.hash).not.toBe(result2.hash);

    // Both should be fetchable and decodable
    for (const [result, expectedKind] of [[result1, "reconciliation"], [result2, "registrum"]] as const) {
      const txResponse = await client.request({
        command: "tx",
        transaction: result.hash,
        binary: false,
      });
      const txData = txResponse.result as unknown as Record<string, unknown>;
      const memos = txData.Memos as readonly { Memo: XrplMemo }[];
      const decoded = decodeMemo(memos[0].Memo);
      expect(decoded.source.kind).toBe(expectedKind);
    }
  });

  it.skipIf(!available)("full witness round-trip: build → submit → fetch → verify", async () => {
    const report = makeReport();
    const attestation = makeAttestation();
    const payload = buildReconciliationPayload(report, attestation);
    const memo = encodeMemo(payload);

    // Step 1: Submit
    const tx: Payment = {
      TransactionType: "Payment",
      Account: GENESIS_ACCOUNT,
      Destination: GENESIS_ACCOUNT,
      Amount: "1",
      Memos: [
        {
          Memo: {
            MemoType: memo.MemoType,
            MemoData: memo.MemoData,
            ...(memo.MemoFormat ? { MemoFormat: memo.MemoFormat } : {}),
          },
        },
      ],
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await submitAndClose(client, signed.tx_blob);

    // Step 2: Fetch from ledger
    const txResponse = await client.request({
      command: "tx",
      transaction: result.hash,
      binary: false,
    });

    const txData = txResponse.result as unknown as Record<string, unknown>;
    const memos = txData.Memos as readonly { Memo: XrplMemo }[];

    // Step 3: Find and decode attestation memo
    const attestiaMemo = memos.find((m) => isAttestiaMemo(m.Memo));
    expect(attestiaMemo).toBeDefined();

    const onChainPayload = decodeMemo(attestiaMemo!.Memo);

    // Step 4: Verify round-trip integrity
    expect(onChainPayload.hash).toBe(payload.hash);
    expect(onChainPayload.timestamp).toBe(payload.timestamp);
    expect(onChainPayload.source).toEqual(payload.source);
    expect(onChainPayload.summary).toEqual(payload.summary);

    // Step 5: Verify content hash is self-consistent
    expect(verifyPayloadHash(onChainPayload)).toBe(true);

    // Step 6: Confirm the decoded payload matches the original exactly
    expect(onChainPayload).toEqual(payload);
  });
});
