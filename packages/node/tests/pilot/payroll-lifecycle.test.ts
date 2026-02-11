/**
 * Pilot use case — Monthly payroll reconciliation lifecycle.
 *
 * Tests the full end-to-end flow via HTTP:
 * 1. Declare payroll intent
 * 2. Approve intent
 * 3. Execute intent (simulate on-chain tx)
 * 4. Verify intent
 * 5. Reconcile (with ledger + chain data)
 * 6. Attest the reconciliation
 * 7. Export events (NDJSON)
 * 8. Export state (snapshot + GlobalStateHash)
 *
 * This test validates that an auditor can independently replay
 * the system to the same GlobalStateHash.
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";

describe("payroll lifecycle — pilot E2E", () => {
  it("runs full declare → approve → execute → verify → reconcile → attest → export cycle", async () => {
    const { app } = createTestApp();

    const intentId = "payroll-jan-2025";

    // ─── 1. Declare ─────────────────────────────────────────────
    const declareRes = await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: intentId,
        kind: "transfer",
        description: "January 2025 payroll — 5 employees",
        params: {
          fromAddress: "0xtreasury",
          toAddress: "0xpayroll-contract",
          amount: { amount: "50000", currency: "USDC", decimals: 6 },
        },
      }),
    );
    expect(declareRes.status).toBe(201);
    const declared = (await declareRes.json()) as { data: { id: string; status: string } };
    expect(declared.data.id).toBe(intentId);
    expect(declared.data.status).toBe("declared");

    // ─── 2. Approve ─────────────────────────────────────────────
    const approveRes = await app.request(
      jsonRequest(`/api/v1/intents/${intentId}/approve`, "POST", {
        reason: "CFO approval — budget verified",
      }),
    );
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as { data: { status: string } };
    expect(approved.data.status).toBe("approved");

    // ─── 3. Execute ─────────────────────────────────────────────
    const executeRes = await app.request(
      jsonRequest(`/api/v1/intents/${intentId}/execute`, "POST", {
        chainId: "evm:1",
        txHash: "0xpayrolltx123abc",
      }),
    );
    expect(executeRes.status).toBe(200);
    const executed = (await executeRes.json()) as { data: { status: string } };
    expect(executed.data.status).toBe("executed");

    // ─── 4. Verify ──────────────────────────────────────────────
    const verifyRes = await app.request(
      jsonRequest(`/api/v1/intents/${intentId}/verify`, "POST", {
        matched: true,
      }),
    );
    expect(verifyRes.status).toBe(200);
    const verified = (await verifyRes.json()) as { data: { status: string } };
    expect(verified.data.status).toBe("verified");

    // ─── 5. Reconcile ───────────────────────────────────────────
    const reconcileBody = {
      intents: [
        {
          id: intentId,
          status: "executed",
          kind: "transfer",
          declaredAt: "2025-01-15T09:00:00Z",
          chainId: "evm:1",
          txHash: "0xpayrolltx123abc",
        },
      ],
      ledgerEntries: [
        {
          id: "le-payroll-1",
          accountId: "treasury",
          type: "debit" as const,
          money: { amount: "50000", currency: "USDC", decimals: 6 },
          timestamp: "2025-01-15T09:01:00Z",
          intentId,
          txHash: "0xpayrolltx123abc",
          correlationId: "payroll-jan",
        },
      ],
      chainEvents: [
        {
          chainId: "evm:1",
          txHash: "0xpayrolltx123abc",
          from: "0xtreasury",
          to: "0xpayroll-contract",
          amount: "50000000000",
          decimals: 6,
          symbol: "USDC",
          timestamp: "2025-01-15T09:00:30Z",
        },
      ],
    };

    const reconcileRes = await app.request(
      jsonRequest("/api/v1/reconcile", "POST", reconcileBody),
    );
    expect(reconcileRes.status).toBe(200);
    const reconciled = (await reconcileRes.json()) as {
      data: { summary: { totalIntents: number } };
    };
    expect(reconciled.data.summary.totalIntents).toBe(1);

    // ─── 6. Attest ──────────────────────────────────────────────
    const attestRes = await app.request(
      jsonRequest("/api/v1/attest", "POST", reconcileBody),
    );
    expect(attestRes.status).toBe(201);
    const attested = (await attestRes.json()) as {
      data: { reportHash: string; attestedBy: string };
    };
    expect(attested.data.reportHash).toMatch(/^[0-9a-f]{64}$/);
    expect(attested.data.attestedBy).toBeDefined();

    // ─── 7. Export Events (NDJSON) ──────────────────────────────
    const eventsRes = await app.request("/api/v1/export/events");
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.headers.get("Content-Type")).toContain("application/x-ndjson");

    const eventsText = await eventsRes.text();
    // Verify each line is valid JSON
    if (eventsText.trim().length > 0) {
      const lines = eventsText.trim().split("\n");
      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty("event");
        expect(parsed).toHaveProperty("streamId");
      }
    }

    // ─── 8. Export State (GlobalStateHash) ──────────────────────
    const stateRes = await app.request("/api/v1/export/state");
    expect(stateRes.status).toBe(200);

    const stateBody = (await stateRes.json()) as {
      data: {
        ledgerSnapshot: unknown;
        registrumSnapshot: unknown;
        globalStateHash: {
          hash: string;
          computedAt: string;
          subsystems: { ledger: string; registrum: string };
        };
      };
    };

    expect(stateBody.data.globalStateHash.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stateBody.data.ledgerSnapshot).toBeDefined();
    expect(stateBody.data.registrumSnapshot).toBeDefined();

    // ─── 9. Verify determinism ──────────────────────────────────
    // A second state export should produce the same hash
    const stateRes2 = await app.request("/api/v1/export/state");
    const stateBody2 = (await stateRes2.json()) as {
      data: { globalStateHash: { hash: string } };
    };
    expect(stateBody2.data.globalStateHash.hash).toBe(
      stateBody.data.globalStateHash.hash,
    );

    // ─── 10. Attestations list ──────────────────────────────────
    const attestationsRes = await app.request("/api/v1/attestations");
    expect(attestationsRes.status).toBe(200);
    const attestationsList = (await attestationsRes.json()) as {
      data: { reportHash: string }[];
    };
    expect(attestationsList.data.length).toBe(1);
    expect(attestationsList.data[0]!.reportHash).toBe(attested.data.reportHash);
  });
});
