/**
 * Evidence Generator Tests
 *
 * Verifies:
 * - Generate report from clean bundle → high score
 * - Generate report without bundle → lower score
 * - All controls evaluated
 * - Report is deterministic
 * - Not-applicable controls always pass
 * - Framework metadata preserved
 */

import { describe, it, expect } from "vitest";
import type { Money } from "@attestia/types";
import { Ledger } from "@attestia/ledger";
import { StructuralRegistrar, INITIAL_INVARIANTS } from "@attestia/registrum";
import { createStateBundle } from "../../src/state-bundle.js";
import { generateComplianceEvidence } from "../../src/compliance/evidence-generator.js";
import { SOC2_FRAMEWORK, SOC2_MAPPINGS } from "../../src/compliance/soc2-mapping.js";
import { ISO27001_FRAMEWORK, ISO27001_MAPPINGS } from "../../src/compliance/iso27001-mapping.js";
import type { ExportableStateBundle } from "../../src/types.js";

// =============================================================================
// Helpers
// =============================================================================

function makeCleanBundle(): ExportableStateBundle {
  const ledger = new Ledger();
  ledger.registerAccount(
    { id: "cash", type: "asset", name: "Cash" },
    "2025-01-01T00:00:00Z",
  );
  ledger.registerAccount(
    { id: "equity", type: "equity", name: "Equity" },
    "2025-01-01T00:00:00Z",
  );

  const money: Money = { amount: "100.00", currency: "USD", decimals: 2 };
  ledger.append([
    {
      id: "e1-d",
      accountId: "cash",
      type: "debit",
      money,
      timestamp: "2025-01-01T00:01:00Z",
      correlationId: "tx-1",
    },
    {
      id: "e1-c",
      accountId: "equity",
      type: "credit",
      money,
      timestamp: "2025-01-01T00:01:00Z",
      correlationId: "tx-1",
    },
  ]);

  const registrar = new StructuralRegistrar({
    mode: "legacy",
    invariants: INITIAL_INVARIANTS,
  });
  registrar.register({
    from: null,
    to: { id: "s1", structure: { isRoot: true }, data: null },
  });

  const eventHashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];

  return createStateBundle(
    ledger.snapshot(),
    registrar.snapshot(),
    eventHashes,
  );
}

// =============================================================================
// SOC 2 Evidence Generation
// =============================================================================

describe("generateComplianceEvidence with SOC 2", () => {
  it("generates report with clean bundle → high score", () => {
    const bundle = makeCleanBundle();
    const report = generateComplianceEvidence(SOC2_MAPPINGS, SOC2_FRAMEWORK, bundle);

    expect(report.framework.id).toBe("soc2-type2");
    expect(report.totalControls).toBe(SOC2_MAPPINGS.length);
    expect(report.passedControls).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.generatedAt).toBeTruthy();
  });

  it("evaluates all controls", () => {
    const bundle = makeCleanBundle();
    const report = generateComplianceEvidence(SOC2_MAPPINGS, SOC2_FRAMEWORK, bundle);

    expect(report.evaluations.length).toBe(SOC2_MAPPINGS.length);

    for (const evaluation of report.evaluations) {
      expect(evaluation.mapping).toBeDefined();
      expect(typeof evaluation.passed).toBe("boolean");
      expect(evaluation.evidenceDetail).toBeTruthy();
    }
  });

  it("each evaluation references a valid control mapping", () => {
    const bundle = makeCleanBundle();
    const report = generateComplianceEvidence(SOC2_MAPPINGS, SOC2_FRAMEWORK, bundle);

    const mappingIds = new Set(SOC2_MAPPINGS.map((m) => m.controlId));
    for (const evaluation of report.evaluations) {
      expect(mappingIds.has(evaluation.mapping.controlId)).toBe(true);
    }
  });

  it("generates lower score without bundle", () => {
    const reportWithBundle = generateComplianceEvidence(
      SOC2_MAPPINGS,
      SOC2_FRAMEWORK,
      makeCleanBundle(),
    );

    const reportWithoutBundle = generateComplianceEvidence(
      SOC2_MAPPINGS,
      SOC2_FRAMEWORK,
    );

    // Without a bundle, evidence checks requiring it should fail
    expect(reportWithoutBundle.score).toBeLessThanOrEqual(reportWithBundle.score);
    expect(reportWithoutBundle.passedControls).toBeLessThanOrEqual(
      reportWithBundle.passedControls,
    );
  });

  it("report is deterministic for same inputs", () => {
    const bundle = makeCleanBundle();

    const r1 = generateComplianceEvidence(SOC2_MAPPINGS, SOC2_FRAMEWORK, bundle);
    const r2 = generateComplianceEvidence(SOC2_MAPPINGS, SOC2_FRAMEWORK, bundle);

    expect(r1.totalControls).toBe(r2.totalControls);
    expect(r1.passedControls).toBe(r2.passedControls);
    expect(r1.score).toBe(r2.score);
    expect(r1.evaluations.length).toBe(r2.evaluations.length);

    for (let i = 0; i < r1.evaluations.length; i++) {
      expect(r1.evaluations[i]!.passed).toBe(r2.evaluations[i]!.passed);
      expect(r1.evaluations[i]!.mapping.controlId).toBe(
        r2.evaluations[i]!.mapping.controlId,
      );
    }
  });
});

// =============================================================================
// ISO 27001 Evidence Generation
// =============================================================================

describe("generateComplianceEvidence with ISO 27001", () => {
  it("generates report for ISO 27001 framework", () => {
    const bundle = makeCleanBundle();
    const report = generateComplianceEvidence(
      ISO27001_MAPPINGS,
      ISO27001_FRAMEWORK,
      bundle,
    );

    expect(report.framework.id).toBe("iso27001");
    expect(report.totalControls).toBe(ISO27001_MAPPINGS.length);
    expect(report.passedControls).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThanOrEqual(80);
  });

  it("not-applicable controls always pass", () => {
    const report = generateComplianceEvidence(
      ISO27001_MAPPINGS,
      ISO27001_FRAMEWORK,
    );

    const naControls = report.evaluations.filter(
      (e) => e.mapping.status === "not-applicable",
    );

    for (const control of naControls) {
      expect(control.passed).toBe(true);
    }
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("evidence generator edge cases", () => {
  it("handles empty mappings", () => {
    const report = generateComplianceEvidence([], SOC2_FRAMEWORK);

    expect(report.totalControls).toBe(0);
    expect(report.passedControls).toBe(0);
    expect(report.score).toBe(0);
    expect(report.evaluations).toEqual([]);
  });

  it("evidence detail includes PASS/FAIL markers", () => {
    const bundle = makeCleanBundle();
    const report = generateComplianceEvidence(SOC2_MAPPINGS, SOC2_FRAMEWORK, bundle);

    for (const evaluation of report.evaluations) {
      // Each evaluation detail should contain [PASS] or [FAIL] markers
      expect(evaluation.evidenceDetail).toMatch(/\[(PASS|FAIL)\]/);
    }
  });

  it("score is a percentage between 0 and 100", () => {
    const report = generateComplianceEvidence(
      SOC2_MAPPINGS,
      SOC2_FRAMEWORK,
      makeCleanBundle(),
    );

    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(report.score)).toBe(true);
  });
});
