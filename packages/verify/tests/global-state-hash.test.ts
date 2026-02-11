/**
 * Tests for GlobalStateHash computation.
 *
 * Verifies:
 * - Determinism: same inputs → same hash
 * - Content-addressing: different inputs → different hash
 * - Subsystem isolation: changing one subsystem changes the global hash
 * - Hash format: valid SHA-256 hex strings
 */

import { describe, it, expect } from "vitest";
import type { AccountRef, LedgerEntry, Money } from "@attestia/types";
import { Ledger } from "@attestia/ledger";
import type { LedgerSnapshot } from "@attestia/ledger";
import { StructuralRegistrar, INITIAL_INVARIANTS } from "@attestia/registrum";
import type { RegistrarSnapshotV1 } from "@attestia/registrum";
import {
  computeGlobalStateHash,
  hashLedgerSnapshot,
  hashRegistrumSnapshot,
} from "../src/global-state-hash.js";

// =============================================================================
// Helpers
// =============================================================================

const SHA256_REGEX = /^[0-9a-f]{64}$/;

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
// Tests
// =============================================================================

describe("hashLedgerSnapshot", () => {
  it("produces a valid SHA-256 hex string", () => {
    const ledger = makeLedger([100]);
    const hash = hashLedgerSnapshot(ledger.snapshot());
    expect(hash).toMatch(SHA256_REGEX);
  });

  it("is deterministic: same snapshot → same hash", () => {
    const ledger = makeLedger([100, 200]);
    const snap = ledger.snapshot();
    const h1 = hashLedgerSnapshot(snap);
    const h2 = hashLedgerSnapshot(snap);
    expect(h1).toBe(h2);
  });

  it("different amounts → different hash", () => {
    const h1 = hashLedgerSnapshot(makeLedger([100]).snapshot());
    const h2 = hashLedgerSnapshot(makeLedger([200]).snapshot());
    expect(h1).not.toBe(h2);
  });
});

describe("hashRegistrumSnapshot", () => {
  it("produces a valid SHA-256 hex string", () => {
    const registrar = makeRegistrar(["s1"]);
    const hash = hashRegistrumSnapshot(registrar.snapshot());
    expect(hash).toMatch(SHA256_REGEX);
  });

  it("is deterministic: same snapshot → same hash", () => {
    const registrar = makeRegistrar(["s1", "s2"]);
    const snap = registrar.snapshot();
    const h1 = hashRegistrumSnapshot(snap);
    const h2 = hashRegistrumSnapshot(snap);
    expect(h1).toBe(h2);
  });

  it("different states → different hash", () => {
    const h1 = hashRegistrumSnapshot(makeRegistrar(["s1"]).snapshot());
    const h2 = hashRegistrumSnapshot(makeRegistrar(["s1", "s2"]).snapshot());
    expect(h1).not.toBe(h2);
  });
});

describe("computeGlobalStateHash", () => {
  it("produces a valid SHA-256 hex string", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);
    const gsh = computeGlobalStateHash(
      ledger.snapshot(),
      registrar.snapshot(),
    );
    expect(gsh.hash).toMatch(SHA256_REGEX);
  });

  it("includes subsystem hashes", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);
    const gsh = computeGlobalStateHash(
      ledger.snapshot(),
      registrar.snapshot(),
    );

    expect(gsh.subsystems.ledger).toMatch(SHA256_REGEX);
    expect(gsh.subsystems.registrum).toMatch(SHA256_REGEX);
  });

  it("subsystem hashes match individual computations", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);
    const ledgerSnap = ledger.snapshot();
    const registrumSnap = registrar.snapshot();

    const gsh = computeGlobalStateHash(ledgerSnap, registrumSnap);

    expect(gsh.subsystems.ledger).toBe(hashLedgerSnapshot(ledgerSnap));
    expect(gsh.subsystems.registrum).toBe(hashRegistrumSnapshot(registrumSnap));
  });

  it("is deterministic: same snapshots → same hash", () => {
    const ledger = makeLedger([100, 200]);
    const registrar = makeRegistrar(["s1", "s2"]);
    const ledgerSnap = ledger.snapshot();
    const registrumSnap = registrar.snapshot();

    const gsh1 = computeGlobalStateHash(ledgerSnap, registrumSnap);
    const gsh2 = computeGlobalStateHash(ledgerSnap, registrumSnap);

    expect(gsh1.hash).toBe(gsh2.hash);
    expect(gsh1.subsystems).toEqual(gsh2.subsystems);
  });

  it("changing ledger changes global hash", () => {
    const registrar = makeRegistrar(["s1"]);
    const registrumSnap = registrar.snapshot();

    const gsh1 = computeGlobalStateHash(
      makeLedger([100]).snapshot(),
      registrumSnap,
    );
    const gsh2 = computeGlobalStateHash(
      makeLedger([200]).snapshot(),
      registrumSnap,
    );

    expect(gsh1.hash).not.toBe(gsh2.hash);
    expect(gsh1.subsystems.ledger).not.toBe(gsh2.subsystems.ledger);
    // Registrum unchanged
    expect(gsh1.subsystems.registrum).toBe(gsh2.subsystems.registrum);
  });

  it("changing registrum changes global hash", () => {
    const ledger = makeLedger([100]);
    const ledgerSnap = ledger.snapshot();

    const gsh1 = computeGlobalStateHash(
      ledgerSnap,
      makeRegistrar(["s1"]).snapshot(),
    );
    const gsh2 = computeGlobalStateHash(
      ledgerSnap,
      makeRegistrar(["s1", "s2"]).snapshot(),
    );

    expect(gsh1.hash).not.toBe(gsh2.hash);
    expect(gsh1.subsystems.registrum).not.toBe(gsh2.subsystems.registrum);
    // Ledger unchanged
    expect(gsh1.subsystems.ledger).toBe(gsh2.subsystems.ledger);
  });

  it("includes computedAt timestamp", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);
    const gsh = computeGlobalStateHash(
      ledger.snapshot(),
      registrar.snapshot(),
    );
    expect(gsh.computedAt).toBeTruthy();
    expect(new Date(gsh.computedAt).getTime()).not.toBeNaN();
  });

  it("global hash is NOT just a concatenation of subsystem hashes", () => {
    const ledger = makeLedger([100]);
    const registrar = makeRegistrar(["s1"]);
    const gsh = computeGlobalStateHash(
      ledger.snapshot(),
      registrar.snapshot(),
    );

    // Global hash is a hash-of-hashes, not a simple concat
    expect(gsh.hash).not.toBe(gsh.subsystems.ledger);
    expect(gsh.hash).not.toBe(gsh.subsystems.registrum);
    expect(gsh.hash).not.toBe(
      gsh.subsystems.ledger + gsh.subsystems.registrum,
    );
  });
});
