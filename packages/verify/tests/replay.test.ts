/**
 * Tests for replay-based verification.
 *
 * Verifies:
 * - Replay roundtrip: snapshot → restore → snapshot produces PASS
 * - Hash mismatch detection: tampered snapshots produce FAIL
 * - verifyHash: quick hash comparison
 * - Discrepancy reporting: structured evidence on failure
 */

import { describe, it, expect } from "vitest";
import type { Money } from "@attestia/types";
import { Ledger } from "@attestia/ledger";
import { StructuralRegistrar, INITIAL_INVARIANTS } from "@attestia/registrum";
import {
  computeGlobalStateHash,
  hashLedgerSnapshot,
} from "../src/global-state-hash.js";
import { verifyByReplay, verifyHash } from "../src/replay.js";

// =============================================================================
// Helpers
// =============================================================================

function makeLedger(amounts: number[]): Ledger {
  const ledger = new Ledger();
  ledger.registerAccount(
    { id: "cash", type: "asset", name: "Cash" },
    "2025-01-01T00:00:00Z",
  );
  ledger.registerAccount(
    { id: "equity", type: "equity", name: "Equity" },
    "2025-01-01T00:00:00Z",
  );

  for (let i = 0; i < amounts.length; i++) {
    const amt = amounts[i]!;
    const money: Money = {
      amount: `${amt}.00`,
      currency: "USD",
      decimals: 2,
    };
    const ts = `2025-01-01T00:${String(i + 1).padStart(2, "0")}:00Z`;
    ledger.append([
      {
        id: `e${i}-d`,
        accountId: "cash",
        type: "debit",
        money,
        timestamp: ts,
        correlationId: `tx-${i}`,
      },
      {
        id: `e${i}-c`,
        accountId: "equity",
        type: "credit",
        money,
        timestamp: ts,
        correlationId: `tx-${i}`,
      },
    ]);
  }
  return ledger;
}

function makeRegistrar(stateIds: string[]): StructuralRegistrar {
  const registrar = new StructuralRegistrar({
    mode: "legacy",
    invariants: INITIAL_INVARIANTS,
  });
  for (const id of stateIds) {
    registrar.register({
      from: null,
      to: { id, structure: { isRoot: true }, data: null },
    });
  }
  return registrar;
}

// =============================================================================
// verifyByReplay
// =============================================================================

describe("verifyByReplay", () => {
  it("PASS: valid snapshots survive replay roundtrip", () => {
    const ledger = makeLedger([100, 200, 300]);
    const registrar = makeRegistrar(["s1", "s2", "s3"]);

    const result = verifyByReplay({
      ledgerSnapshot: ledger.snapshot(),
      registrumSnapshot: registrar.snapshot(),
    });

    expect(result.verdict).toBe("PASS");
    expect(result.discrepancies).toHaveLength(0);
    expect(result.originalHash.hash).toBe(result.replayedHash.hash);
  });

  it("PASS: empty ledger + single registrum state", () => {
    const ledger = new Ledger();
    const registrar = makeRegistrar(["root"]);

    const result = verifyByReplay({
      ledgerSnapshot: ledger.snapshot(),
      registrumSnapshot: registrar.snapshot(),
    });

    expect(result.verdict).toBe("PASS");
    expect(result.discrepancies).toHaveLength(0);
  });

  it("PASS: with matching expectedHash", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);
    const ledgerSnap = ledger.snapshot();
    const registrumSnap = registrar.snapshot();

    const gsh = computeGlobalStateHash(ledgerSnap, registrumSnap);

    const result = verifyByReplay({
      ledgerSnapshot: ledgerSnap,
      registrumSnapshot: registrumSnap,
      expectedHash: gsh.hash,
    });

    expect(result.verdict).toBe("PASS");
    expect(result.discrepancies).toHaveLength(0);
  });

  it("FAIL: with wrong expectedHash", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);

    const result = verifyByReplay({
      ledgerSnapshot: ledger.snapshot(),
      registrumSnapshot: registrar.snapshot(),
      expectedHash: "0000000000000000000000000000000000000000000000000000000000000000",
    });

    expect(result.verdict).toBe("FAIL");
    expect(result.discrepancies.length).toBeGreaterThan(0);

    const hashMismatch = result.discrepancies.find(
      (d) => d.description.includes("does not match expected"),
    );
    expect(hashMismatch).toBeDefined();
    expect(hashMismatch!.subsystem).toBe("global");
  });

  it("subsystem hashes are preserved in result", () => {
    const ledger = makeLedger([100, 200]);
    const registrar = makeRegistrar(["s1", "s2"]);
    const ledgerSnap = ledger.snapshot();
    const registrumSnap = registrar.snapshot();

    const result = verifyByReplay({
      ledgerSnapshot: ledgerSnap,
      registrumSnapshot: registrumSnap,
    });

    expect(result.originalHash.subsystems.ledger).toBe(
      hashLedgerSnapshot(ledgerSnap),
    );
    expect(result.replayedHash.subsystems.ledger).toBe(
      result.originalHash.subsystems.ledger,
    );
  });

  it("multi-transaction ledger survives replay", () => {
    const ledger = makeLedger([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const registrar = makeRegistrar(["a", "b", "c"]);

    const result = verifyByReplay({
      ledgerSnapshot: ledger.snapshot(),
      registrumSnapshot: registrar.snapshot(),
    });

    expect(result.verdict).toBe("PASS");
  });
});

// =============================================================================
// verifyHash
// =============================================================================

describe("verifyHash", () => {
  it("PASS: correct expected hash", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);
    const ledgerSnap = ledger.snapshot();
    const registrumSnap = registrar.snapshot();

    const gsh = computeGlobalStateHash(ledgerSnap, registrumSnap);

    const result = verifyHash(
      { ledgerSnapshot: ledgerSnap, registrumSnapshot: registrumSnap },
      gsh.hash,
    );

    expect(result.verdict).toBe("PASS");
    expect(result.discrepancies).toHaveLength(0);
    expect(result.globalHash.hash).toBe(gsh.hash);
  });

  it("FAIL: wrong expected hash", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);

    const result = verifyHash(
      {
        ledgerSnapshot: ledger.snapshot(),
        registrumSnapshot: registrar.snapshot(),
      },
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );

    expect(result.verdict).toBe("FAIL");
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]!.subsystem).toBe("global");
    expect(result.discrepancies[0]!.expected).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  it("includes verifiedAt timestamp", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);

    const gsh = computeGlobalStateHash(
      ledger.snapshot(),
      registrar.snapshot(),
    );
    const result = verifyHash(
      {
        ledgerSnapshot: ledger.snapshot(),
        registrumSnapshot: registrar.snapshot(),
      },
      gsh.hash,
    );

    expect(result.verifiedAt).toBeTruthy();
    expect(new Date(result.verifiedAt).getTime()).not.toBeNaN();
  });

  it("globalHash in result matches computed hash", () => {
    const ledger = makeLedger([50]);
    const registrar = makeRegistrar(["state1"]);
    const ledgerSnap = ledger.snapshot();
    const registrumSnap = registrar.snapshot();

    const gsh = computeGlobalStateHash(ledgerSnap, registrumSnap);
    const result = verifyHash(
      { ledgerSnapshot: ledgerSnap, registrumSnapshot: registrumSnap },
      gsh.hash,
    );

    expect(result.globalHash.hash).toBe(gsh.hash);
    expect(result.globalHash.subsystems.ledger).toBe(gsh.subsystems.ledger);
    expect(result.globalHash.subsystems.registrum).toBe(
      gsh.subsystems.registrum,
    );
  });
});
