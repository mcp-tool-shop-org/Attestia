/**
 * Verification Consensus Tests
 *
 * Verifies:
 * - Unanimous PASS → PASS
 * - Unanimous FAIL → FAIL
 * - Split verdict (majority wins)
 * - Exact 50/50 → FAIL (conservative)
 * - Single verifier (minimum not met)
 * - Empty reports
 * - Dissenter tracking
 * - Deterministic aggregation
 * - isConsensusReached threshold check
 */

import { describe, it, expect } from "vitest";
import type { VerifierReport } from "../src/types.js";
import {
  aggregateVerifierReports,
  isConsensusReached,
} from "../src/verification-consensus.js";

// =============================================================================
// Helpers
// =============================================================================

function makeReport(
  verifierId: string,
  verdict: "PASS" | "FAIL",
): VerifierReport {
  return {
    reportId: `report-${verifierId}`,
    verifierId,
    verdict,
    subsystemChecks: [],
    discrepancies: verdict === "FAIL" ? ["some mismatch"] : [],
    bundleHash: "a".repeat(64),
    verifiedAt: "2025-06-15T00:00:00Z",
  };
}

// =============================================================================
// isConsensusReached
// =============================================================================

describe("isConsensusReached", () => {
  it("returns true when enough verifiers have reported", () => {
    const reports = [makeReport("v1", "PASS"), makeReport("v2", "PASS")];
    expect(isConsensusReached(reports, 2)).toBe(true);
  });

  it("returns true when more than minimum have reported", () => {
    const reports = [
      makeReport("v1", "PASS"),
      makeReport("v2", "PASS"),
      makeReport("v3", "FAIL"),
    ];
    expect(isConsensusReached(reports, 2)).toBe(true);
  });

  it("returns false when below minimum", () => {
    const reports = [makeReport("v1", "PASS")];
    expect(isConsensusReached(reports, 3)).toBe(false);
  });

  it("returns false for empty reports", () => {
    expect(isConsensusReached([], 1)).toBe(false);
  });

  it("returns true when minimum is 0", () => {
    expect(isConsensusReached([], 0)).toBe(true);
  });
});

// =============================================================================
// aggregateVerifierReports
// =============================================================================

describe("aggregateVerifierReports", () => {
  it("unanimous PASS → PASS", () => {
    const reports = [
      makeReport("v1", "PASS"),
      makeReport("v2", "PASS"),
      makeReport("v3", "PASS"),
    ];
    const result = aggregateVerifierReports(reports, 2);

    expect(result.verdict).toBe("PASS");
    expect(result.totalVerifiers).toBe(3);
    expect(result.passCount).toBe(3);
    expect(result.failCount).toBe(0);
    expect(result.agreementRatio).toBe(1);
    expect(result.quorumReached).toBe(true);
    expect(result.dissenters).toEqual([]);
    expect(result.consensusAt).toBeTruthy();
  });

  it("unanimous FAIL → FAIL", () => {
    const reports = [
      makeReport("v1", "FAIL"),
      makeReport("v2", "FAIL"),
      makeReport("v3", "FAIL"),
    ];
    const result = aggregateVerifierReports(reports, 2);

    expect(result.verdict).toBe("FAIL");
    expect(result.passCount).toBe(0);
    expect(result.failCount).toBe(3);
    expect(result.agreementRatio).toBe(1);
    expect(result.dissenters).toEqual([]);
  });

  it("majority PASS (2/3) → PASS", () => {
    const reports = [
      makeReport("v1", "PASS"),
      makeReport("v2", "PASS"),
      makeReport("v3", "FAIL"),
    ];
    const result = aggregateVerifierReports(reports, 2);

    expect(result.verdict).toBe("PASS");
    expect(result.passCount).toBe(2);
    expect(result.failCount).toBe(1);
    expect(result.agreementRatio).toBeCloseTo(2 / 3);
    expect(result.dissenters).toEqual(["v3"]);
  });

  it("majority FAIL (2/3) → FAIL", () => {
    const reports = [
      makeReport("v1", "FAIL"),
      makeReport("v2", "FAIL"),
      makeReport("v3", "PASS"),
    ];
    const result = aggregateVerifierReports(reports, 2);

    expect(result.verdict).toBe("FAIL");
    expect(result.passCount).toBe(1);
    expect(result.failCount).toBe(2);
    expect(result.agreementRatio).toBeCloseTo(2 / 3);
    expect(result.dissenters).toEqual(["v3"]);
  });

  it("exact 50/50 → FAIL (conservative)", () => {
    const reports = [
      makeReport("v1", "PASS"),
      makeReport("v2", "FAIL"),
    ];
    const result = aggregateVerifierReports(reports, 1);

    expect(result.verdict).toBe("FAIL");
    expect(result.passCount).toBe(1);
    expect(result.failCount).toBe(1);
    expect(result.agreementRatio).toBe(0.5);
    // The PASS verifier dissents from the FAIL verdict
    expect(result.dissenters).toEqual(["v1"]);
  });

  it("4-way split (2 PASS, 2 FAIL) → FAIL", () => {
    const reports = [
      makeReport("v1", "PASS"),
      makeReport("v2", "FAIL"),
      makeReport("v3", "PASS"),
      makeReport("v4", "FAIL"),
    ];
    const result = aggregateVerifierReports(reports, 3);

    expect(result.verdict).toBe("FAIL");
    expect(result.agreementRatio).toBe(0.5);
    expect(result.quorumReached).toBe(true);
  });

  it("single verifier PASS → PASS when minimum is 1", () => {
    const reports = [makeReport("v1", "PASS")];
    const result = aggregateVerifierReports(reports, 1);

    expect(result.verdict).toBe("PASS");
    expect(result.quorumReached).toBe(true);
  });

  it("single verifier, minimum 3 → quorum not reached", () => {
    const reports = [makeReport("v1", "PASS")];
    const result = aggregateVerifierReports(reports, 3);

    expect(result.verdict).toBe("PASS");
    expect(result.quorumReached).toBe(false);
  });

  it("empty reports → FAIL with 0 agreement", () => {
    const result = aggregateVerifierReports([], 1);

    expect(result.verdict).toBe("FAIL");
    expect(result.totalVerifiers).toBe(0);
    expect(result.passCount).toBe(0);
    expect(result.failCount).toBe(0);
    expect(result.agreementRatio).toBe(0);
    expect(result.quorumReached).toBe(false);
    expect(result.dissenters).toEqual([]);
  });

  it("tracks all dissenters by verifier ID", () => {
    const reports = [
      makeReport("alpha", "PASS"),
      makeReport("bravo", "PASS"),
      makeReport("charlie", "FAIL"),
      makeReport("delta", "PASS"),
      makeReport("echo", "FAIL"),
    ];
    const result = aggregateVerifierReports(reports, 3);

    expect(result.verdict).toBe("PASS");
    expect(result.dissenters).toEqual(["charlie", "echo"]);
    expect(result.dissenters.length).toBe(2);
  });

  it("deterministic verdict for same inputs", () => {
    const reports = [
      makeReport("v1", "PASS"),
      makeReport("v2", "FAIL"),
      makeReport("v3", "PASS"),
    ];

    const r1 = aggregateVerifierReports(reports, 2);
    const r2 = aggregateVerifierReports(reports, 2);

    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.totalVerifiers).toBe(r2.totalVerifiers);
    expect(r1.passCount).toBe(r2.passCount);
    expect(r1.failCount).toBe(r2.failCount);
    expect(r1.agreementRatio).toBe(r2.agreementRatio);
    expect(r1.dissenters).toEqual(r2.dissenters);
  });

  it("default minimumVerifiers is 1", () => {
    const reports = [makeReport("v1", "PASS")];
    const result = aggregateVerifierReports(reports);

    expect(result.quorumReached).toBe(true);
  });

  it("large group with 3/5 majority PASS", () => {
    const reports = [
      makeReport("v1", "PASS"),
      makeReport("v2", "PASS"),
      makeReport("v3", "PASS"),
      makeReport("v4", "FAIL"),
      makeReport("v5", "FAIL"),
    ];
    const result = aggregateVerifierReports(reports, 5);

    expect(result.verdict).toBe("PASS");
    expect(result.passCount).toBe(3);
    expect(result.failCount).toBe(2);
    expect(result.agreementRatio).toBe(0.6);
    expect(result.quorumReached).toBe(true);
  });
});
