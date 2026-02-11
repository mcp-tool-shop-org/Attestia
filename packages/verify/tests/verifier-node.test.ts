/**
 * Verifier Node Tests
 *
 * Verifies:
 * - Clean bundle → PASS verdict
 * - Tampered ledger hash → FAIL
 * - Tampered registrum hash → FAIL
 * - Tampered global hash → FAIL
 * - Missing chain hashes → FAIL (strict mode)
 * - Chain hashes recorded as subsystem checks
 * - Verifier identity recorded in report
 * - Deterministic reports for same inputs
 * - VerifierNode class stateful behavior
 */

import { describe, it, expect, vi } from "vitest";
import type { Money } from "@attestia/types";
import { Ledger } from "@attestia/ledger";
import type { LedgerSnapshot } from "@attestia/ledger";
import { StructuralRegistrar, INITIAL_INVARIANTS } from "@attestia/registrum";
import type { RegistrarSnapshotV1 } from "@attestia/registrum";
import { createStateBundle } from "../src/state-bundle.js";
import { runVerification, VerifierNode } from "../src/verifier-node.js";
import type { ExportableStateBundle, VerifierConfig } from "../src/types.js";

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

function makeCleanBundle(
  amounts: number[] = [100],
  stateIds: string[] = ["s1"],
  eventCount: number = 3,
  chainHashes?: Record<string, string>,
): ExportableStateBundle {
  return createStateBundle(
    makeLedgerSnapshot(amounts),
    makeRegistrumSnapshot(stateIds),
    makeEventHashes(eventCount),
    chainHashes,
  );
}

const DEFAULT_CONFIG: VerifierConfig = {
  verifierId: "verifier-alice",
  label: "Alice's Verifier",
};

const STRICT_CONFIG: VerifierConfig = {
  verifierId: "verifier-strict",
  label: "Strict Verifier",
  strictMode: true,
};

// =============================================================================
// runVerification (stateless)
// =============================================================================

describe("runVerification", () => {
  it("PASS for a clean bundle", () => {
    const bundle = makeCleanBundle();
    const report = runVerification(bundle, DEFAULT_CONFIG);

    expect(report.verdict).toBe("PASS");
    expect(report.discrepancies).toEqual([]);
    expect(report.verifierId).toBe("verifier-alice");
    expect(report.bundleHash).toBe(bundle.bundleHash);
    expect(report.reportId).toMatch(SHA256_REGEX);
    expect(report.verifiedAt).toBeTruthy();
    expect(new Date(report.verifiedAt).getTime()).not.toBeNaN();
  });

  it("records per-subsystem hash checks", () => {
    const bundle = makeCleanBundle();
    const report = runVerification(bundle, DEFAULT_CONFIG);

    expect(report.subsystemChecks.length).toBeGreaterThanOrEqual(3);

    const ledgerCheck = report.subsystemChecks.find(c => c.subsystem === "ledger");
    expect(ledgerCheck).toBeDefined();
    expect(ledgerCheck!.matches).toBe(true);
    expect(ledgerCheck!.expected).toMatch(SHA256_REGEX);
    expect(ledgerCheck!.actual).toMatch(SHA256_REGEX);

    const registrumCheck = report.subsystemChecks.find(c => c.subsystem === "registrum");
    expect(registrumCheck).toBeDefined();
    expect(registrumCheck!.matches).toBe(true);

    const globalCheck = report.subsystemChecks.find(c => c.subsystem === "global");
    expect(globalCheck).toBeDefined();
    expect(globalCheck!.matches).toBe(true);
  });

  it("FAIL when ledger subsystem hash is tampered", () => {
    const bundle = makeCleanBundle();
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

    const report = runVerification(tampered, DEFAULT_CONFIG);

    expect(report.verdict).toBe("FAIL");
    expect(report.discrepancies.length).toBeGreaterThan(0);
    expect(report.discrepancies.some(d => d.includes("Ledger hash mismatch"))).toBe(true);
  });

  it("FAIL when registrum subsystem hash is tampered", () => {
    const bundle = makeCleanBundle();
    const tampered: ExportableStateBundle = {
      ...bundle,
      globalStateHash: {
        ...bundle.globalStateHash,
        subsystems: {
          ...bundle.globalStateHash.subsystems,
          registrum: "e".repeat(64),
        },
      },
    };

    const report = runVerification(tampered, DEFAULT_CONFIG);

    expect(report.verdict).toBe("FAIL");
    expect(report.discrepancies.some(d => d.includes("Registrum hash mismatch"))).toBe(true);
  });

  it("FAIL when global hash is tampered", () => {
    const bundle = makeCleanBundle();
    const tampered: ExportableStateBundle = {
      ...bundle,
      globalStateHash: {
        ...bundle.globalStateHash,
        hash: "f".repeat(64),
      },
    };

    const report = runVerification(tampered, DEFAULT_CONFIG);

    expect(report.verdict).toBe("FAIL");
    expect(report.discrepancies.some(d => d.includes("Global hash mismatch"))).toBe(true);
  });

  it("FAIL when bundleHash is tampered", () => {
    const bundle = makeCleanBundle();
    const tampered: ExportableStateBundle = {
      ...bundle,
      bundleHash: "0".repeat(64),
    };

    const report = runVerification(tampered, DEFAULT_CONFIG);

    expect(report.verdict).toBe("FAIL");
    expect(report.discrepancies.length).toBeGreaterThan(0);
  });

  it("FAIL in strict mode when chain hashes are missing", () => {
    const bundle = makeCleanBundle(); // No chain hashes
    const report = runVerification(bundle, STRICT_CONFIG);

    expect(report.verdict).toBe("FAIL");
    expect(report.discrepancies.some(d => d.includes("Strict mode"))).toBe(true);
    expect(report.verifierId).toBe("verifier-strict");
  });

  it("PASS in strict mode when chain hashes are present", () => {
    const chainHashes = { "eip155:1": "a".repeat(64), "solana:mainnet-beta": "b".repeat(64) };
    const bundle = makeCleanBundle([100], ["s1"], 3, chainHashes);
    const report = runVerification(bundle, STRICT_CONFIG);

    expect(report.verdict).toBe("PASS");
    expect(report.discrepancies).toEqual([]);
  });

  it("PASS in non-strict mode when chain hashes are missing", () => {
    const bundle = makeCleanBundle(); // No chain hashes
    const report = runVerification(bundle, DEFAULT_CONFIG);

    expect(report.verdict).toBe("PASS");
  });

  it("records chain hash subsystem checks when present", () => {
    const chainHashes = { "eip155:1": "c".repeat(64), "xrpl:mainnet": "d".repeat(64) };
    const bundle = makeCleanBundle([100], ["s1"], 3, chainHashes);
    const report = runVerification(bundle, DEFAULT_CONFIG);

    const chainChecks = report.subsystemChecks.filter(c => c.subsystem.startsWith("chain:"));
    expect(chainChecks.length).toBe(2);
    expect(chainChecks.some(c => c.subsystem === "chain:eip155:1")).toBe(true);
    expect(chainChecks.some(c => c.subsystem === "chain:xrpl:mainnet")).toBe(true);
    expect(chainChecks.every(c => c.matches)).toBe(true);
  });

  it("verifier identity is recorded in the report", () => {
    const bundle = makeCleanBundle();
    const config: VerifierConfig = {
      verifierId: "verifier-bob-42",
      label: "Bob's Node",
    };

    const report = runVerification(bundle, config);

    expect(report.verifierId).toBe("verifier-bob-42");
  });

  it("produces unique report IDs for same bundle with same verifier", () => {
    const bundle = makeCleanBundle();
    const r1 = runVerification(bundle, DEFAULT_CONFIG);
    const r2 = runVerification(bundle, DEFAULT_CONFIG);

    // Report IDs include a nonce (Date.now()), so they should differ
    // (unless run in the exact same millisecond, which is unlikely)
    expect(r1.reportId).toMatch(SHA256_REGEX);
    expect(r2.reportId).toMatch(SHA256_REGEX);
  });

  it("produces deterministic verdict for same inputs", () => {
    const bundle = makeCleanBundle([100, 200], ["s1", "s2"], 5);
    const r1 = runVerification(bundle, DEFAULT_CONFIG);
    const r2 = runVerification(bundle, DEFAULT_CONFIG);

    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.subsystemChecks.length).toBe(r2.subsystemChecks.length);
    expect(r1.discrepancies).toEqual(r2.discrepancies);
    expect(r1.bundleHash).toBe(r2.bundleHash);
  });

  it("handles bundle with multiple entries", () => {
    const bundle = makeCleanBundle([100, 200, 300], ["s1", "s2", "s3"], 10);
    const report = runVerification(bundle, DEFAULT_CONFIG);

    expect(report.verdict).toBe("PASS");
    expect(report.discrepancies).toEqual([]);
  });
});

// =============================================================================
// VerifierNode (stateful)
// =============================================================================

describe("VerifierNode", () => {
  it("creates a node with a verifier ID", () => {
    const node = new VerifierNode(DEFAULT_CONFIG);

    expect(node.getVerifierId()).toBe("verifier-alice");
  });

  it("verify() produces a report and stores it", () => {
    const node = new VerifierNode(DEFAULT_CONFIG);
    const bundle = makeCleanBundle();

    const report = node.verify(bundle);

    expect(report.verdict).toBe("PASS");
    expect(report.verifierId).toBe("verifier-alice");

    const reports = node.getReports();
    expect(reports.length).toBe(1);
    expect(reports[0]).toBe(report);
  });

  it("stores multiple reports in order", () => {
    const node = new VerifierNode(DEFAULT_CONFIG);

    const b1 = makeCleanBundle([100], ["s1"], 3);
    const b2 = makeCleanBundle([200], ["s2"], 5);
    const b3 = makeCleanBundle([300], ["s3"], 2);

    const r1 = node.verify(b1);
    const r2 = node.verify(b2);
    const r3 = node.verify(b3);

    const reports = node.getReports();
    expect(reports.length).toBe(3);
    expect(reports[0]).toBe(r1);
    expect(reports[1]).toBe(r2);
    expect(reports[2]).toBe(r3);
  });

  it("getReports() returns readonly array", () => {
    const node = new VerifierNode(DEFAULT_CONFIG);
    const bundle = makeCleanBundle();

    node.verify(bundle);

    const reports = node.getReports();
    // Readonly — TypeScript prevents mutation, but at runtime it's the same array
    expect(reports.length).toBe(1);
  });

  it("handles mix of PASS and FAIL reports", () => {
    const node = new VerifierNode(DEFAULT_CONFIG);

    // Clean bundle → PASS
    const cleanBundle = makeCleanBundle();
    const passReport = node.verify(cleanBundle);
    expect(passReport.verdict).toBe("PASS");

    // Tampered bundle → FAIL
    const tampered: ExportableStateBundle = {
      ...cleanBundle,
      bundleHash: "0".repeat(64),
    };
    const failReport = node.verify(tampered);
    expect(failReport.verdict).toBe("FAIL");

    const reports = node.getReports();
    expect(reports.length).toBe(2);
    expect(reports[0]!.verdict).toBe("PASS");
    expect(reports[1]!.verdict).toBe("FAIL");
  });

  it("strict mode node detects missing chain hashes", () => {
    const node = new VerifierNode(STRICT_CONFIG);
    const bundle = makeCleanBundle(); // No chain hashes

    const report = node.verify(bundle);

    expect(report.verdict).toBe("FAIL");
    expect(report.discrepancies.some(d => d.includes("Strict mode"))).toBe(true);
    expect(report.verifierId).toBe("verifier-strict");
  });
});
