/**
 * Exportable State Bundle Tests
 *
 * Verifies:
 * - Bundle creation determinism
 * - Integrity verification (pass + tampered)
 * - Hash consistency with computeGlobalStateHash
 * - Empty inputs
 * - Chain hash inclusion
 */

import { describe, it, expect, vi } from "vitest";
import type { Money } from "@attestia/types";
import { Ledger } from "@attestia/ledger";
import type { LedgerSnapshot } from "@attestia/ledger";
import { StructuralRegistrar, INITIAL_INVARIANTS } from "@attestia/registrum";
import type { RegistrarSnapshotV1 } from "@attestia/registrum";
import { createStateBundle, verifyBundleIntegrity } from "../src/state-bundle.js";
import { computeGlobalStateHash } from "../src/global-state-hash.js";
import type { ExportableStateBundle } from "../src/types.js";

// =============================================================================
// Helpers
// =============================================================================

const SHA256_REGEX = /^[0-9a-f]{64}$/;

function makeLedgerSnapshot(amounts: number[]): LedgerSnapshot {
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
    const money: Money = { amount: `${amt}.00`, currency: "USD", decimals: 2 };
    const ts = `2025-01-01T00:${String(i + 1).padStart(2, "0")}:00Z`;
    ledger.append([
      { id: `e${i}-d`, accountId: "cash", type: "debit", money, timestamp: ts, correlationId: `tx-${i}` },
      { id: `e${i}-c`, accountId: "equity", type: "credit", money, timestamp: ts, correlationId: `tx-${i}` },
    ]);
  }

  return ledger.snapshot();
}

function makeRegistrumSnapshot(stateIds: string[]): RegistrarSnapshotV1 {
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
  return registrar.snapshot();
}

function makeEventHashes(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    "a".repeat(63) + i.toString(16),
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("createStateBundle", () => {
  it("creates a valid bundle with all required fields", () => {
    const ledger = makeLedgerSnapshot([100]);
    const registrum = makeRegistrumSnapshot(["s1"]);
    const events = makeEventHashes(3);

    const bundle = createStateBundle(ledger, registrum, events);

    expect(bundle.version).toBe(1);
    expect(bundle.ledgerSnapshot).toBe(ledger);
    expect(bundle.registrumSnapshot).toBe(registrum);
    expect(bundle.eventHashes).toEqual(events);
    expect(bundle.globalStateHash.hash).toMatch(SHA256_REGEX);
    expect(bundle.bundleHash).toMatch(SHA256_REGEX);
    expect(bundle.exportedAt).toBeTruthy();
    expect(bundle.chainHashes).toBeUndefined();
  });

  it("produces deterministic bundleHash for same inputs", () => {
    const now = new Date("2025-06-01T00:00:00.000Z");
    vi.useFakeTimers({ now });

    try {
      const ledger = makeLedgerSnapshot([100, 200]);
      const registrum = makeRegistrumSnapshot(["s1", "s2"]);
      const events = makeEventHashes(5);

      const b1 = createStateBundle(ledger, registrum, events);
      const b2 = createStateBundle(ledger, registrum, events);

      expect(b1.bundleHash).toBe(b2.bundleHash);
      expect(b1.globalStateHash.hash).toBe(b2.globalStateHash.hash);
    } finally {
      vi.useRealTimers();
    }
  });

  it("different event hashes produce different bundleHash", () => {
    const ledger = makeLedgerSnapshot([100]);
    const registrum = makeRegistrumSnapshot(["s1"]);

    const b1 = createStateBundle(ledger, registrum, makeEventHashes(3));
    const b2 = createStateBundle(ledger, registrum, makeEventHashes(4));

    expect(b1.bundleHash).not.toBe(b2.bundleHash);
  });

  it("different ledger snapshots produce different hashes", () => {
    const registrum = makeRegistrumSnapshot(["s1"]);
    const events = makeEventHashes(3);

    const b1 = createStateBundle(makeLedgerSnapshot([100]), registrum, events);
    const b2 = createStateBundle(makeLedgerSnapshot([200]), registrum, events);

    expect(b1.bundleHash).not.toBe(b2.bundleHash);
    expect(b1.globalStateHash.hash).not.toBe(b2.globalStateHash.hash);
  });

  it("includes chainHashes when provided", () => {
    const ledger = makeLedgerSnapshot([100]);
    const registrum = makeRegistrumSnapshot(["s1"]);
    const events = makeEventHashes(2);
    const chainHashes = { "eip155:1": "a".repeat(64), "xrpl:mainnet": "b".repeat(64) };

    const bundle = createStateBundle(ledger, registrum, events, chainHashes);

    expect(bundle.chainHashes).toEqual(chainHashes);
    expect(bundle.globalStateHash.subsystems.chains).toEqual(chainHashes);
  });

  it("omits chainHashes when empty object provided", () => {
    const ledger = makeLedgerSnapshot([100]);
    const registrum = makeRegistrumSnapshot(["s1"]);
    const events = makeEventHashes(2);

    const bundle = createStateBundle(ledger, registrum, events, {});

    expect(bundle.chainHashes).toBeUndefined();
  });

  it("globalStateHash matches computeGlobalStateHash directly", () => {
    const ledger = makeLedgerSnapshot([100, 200]);
    const registrum = makeRegistrumSnapshot(["s1"]);
    const events = makeEventHashes(3);

    const bundle = createStateBundle(ledger, registrum, events);
    const direct = computeGlobalStateHash(ledger, registrum);

    expect(bundle.globalStateHash.hash).toBe(direct.hash);
    expect(bundle.globalStateHash.subsystems.ledger).toBe(direct.subsystems.ledger);
    expect(bundle.globalStateHash.subsystems.registrum).toBe(direct.subsystems.registrum);
  });

  it("globalStateHash with chainHashes matches computeGlobalStateHash", () => {
    const ledger = makeLedgerSnapshot([100]);
    const registrum = makeRegistrumSnapshot(["s1"]);
    const events = makeEventHashes(2);
    const chainHashes = { "eip155:1": "c".repeat(64) };

    const bundle = createStateBundle(ledger, registrum, events, chainHashes);
    const direct = computeGlobalStateHash(ledger, registrum, chainHashes);

    expect(bundle.globalStateHash.hash).toBe(direct.hash);
  });

  it("handles empty event hashes", () => {
    const ledger = makeLedgerSnapshot([100]);
    const registrum = makeRegistrumSnapshot(["s1"]);

    const bundle = createStateBundle(ledger, registrum, []);

    expect(bundle.eventHashes).toEqual([]);
    expect(bundle.bundleHash).toMatch(SHA256_REGEX);
  });
});

describe("verifyBundleIntegrity", () => {
  it("PASS for a clean bundle", () => {
    const ledger = makeLedgerSnapshot([100, 200]);
    const registrum = makeRegistrumSnapshot(["s1", "s2"]);
    const events = makeEventHashes(5);

    const bundle = createStateBundle(ledger, registrum, events);
    const result = verifyBundleIntegrity(bundle);

    expect(result.verdict).toBe("PASS");
    expect(result.bundleHashValid).toBe(true);
    expect(result.globalHashValid).toBe(true);
    expect(result.discrepancies).toEqual([]);
  });

  it("FAIL when bundleHash is tampered", () => {
    const bundle = createStateBundle(
      makeLedgerSnapshot([100]),
      makeRegistrumSnapshot(["s1"]),
      makeEventHashes(3),
    );

    const tampered: ExportableStateBundle = {
      ...bundle,
      bundleHash: "0".repeat(64),
    };

    const result = verifyBundleIntegrity(tampered);

    expect(result.verdict).toBe("FAIL");
    expect(result.bundleHashValid).toBe(false);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    expect(result.discrepancies.some(d => d.includes("Bundle hash mismatch"))).toBe(true);
  });

  it("FAIL when globalStateHash is tampered", () => {
    const bundle = createStateBundle(
      makeLedgerSnapshot([100]),
      makeRegistrumSnapshot(["s1"]),
      makeEventHashes(3),
    );

    const tampered: ExportableStateBundle = {
      ...bundle,
      globalStateHash: {
        ...bundle.globalStateHash,
        hash: "f".repeat(64),
      },
    };

    const result = verifyBundleIntegrity(tampered);

    expect(result.verdict).toBe("FAIL");
    expect(result.globalHashValid).toBe(false);
    expect(result.discrepancies.some(d => d.includes("GlobalStateHash mismatch"))).toBe(true);
  });

  it("FAIL when ledger subsystem hash is tampered", () => {
    const bundle = createStateBundle(
      makeLedgerSnapshot([100]),
      makeRegistrumSnapshot(["s1"]),
      makeEventHashes(2),
    );

    const tampered: ExportableStateBundle = {
      ...bundle,
      globalStateHash: {
        ...bundle.globalStateHash,
        subsystems: {
          ...bundle.globalStateHash.subsystems,
          ledger: "d".repeat(64),
        },
      },
    };

    const result = verifyBundleIntegrity(tampered);

    expect(result.verdict).toBe("FAIL");
    expect(result.discrepancies.some(d => d.includes("Ledger hash mismatch"))).toBe(true);
  });

  it("PASS for bundle with chainHashes", () => {
    const chainHashes = { "eip155:1": "a".repeat(64), "solana:mainnet-beta": "b".repeat(64) };
    const bundle = createStateBundle(
      makeLedgerSnapshot([100]),
      makeRegistrumSnapshot(["s1"]),
      makeEventHashes(3),
      chainHashes,
    );

    const result = verifyBundleIntegrity(bundle);

    expect(result.verdict).toBe("PASS");
    expect(result.bundleHashValid).toBe(true);
    expect(result.globalHashValid).toBe(true);
  });

  it("FAIL when event hashes are altered (changes bundleHash mismatch)", () => {
    const bundle = createStateBundle(
      makeLedgerSnapshot([100]),
      makeRegistrumSnapshot(["s1"]),
      makeEventHashes(3),
    );

    // Alter event hashes but keep old bundleHash
    const tampered: ExportableStateBundle = {
      ...bundle,
      eventHashes: makeEventHashes(4),
    };

    const result = verifyBundleIntegrity(tampered);

    expect(result.verdict).toBe("FAIL");
    expect(result.bundleHashValid).toBe(false);
  });

  it("verifiedAt is populated", () => {
    const bundle = createStateBundle(
      makeLedgerSnapshot([100]),
      makeRegistrumSnapshot(["s1"]),
      makeEventHashes(1),
    );

    const result = verifyBundleIntegrity(bundle);

    expect(result.verifiedAt).toBeTruthy();
    expect(new Date(result.verifiedAt).getTime()).not.toBeNaN();
  });
});
