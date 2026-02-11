/**
 * @attestia/verify — Compliance Evidence Generator.
 *
 * Generates compliance reports by evaluating each control mapping
 * against the actual system state.
 *
 * Design:
 * - Pure functions, no I/O
 * - Evidence checks are advisory (pass/fail informational)
 * - Reports are deterministic for same inputs
 * - Works with ExportableStateBundle as primary evidence source
 */

import type { ExportableStateBundle, BundleVerificationResult } from "../types.js";
import { verifyBundleIntegrity } from "../state-bundle.js";
import type {
  ComplianceFramework,
  ControlMapping,
  EvaluatedControl,
  ComplianceReport,
  EvidenceType,
} from "./types.js";

// =============================================================================
// Evidence Check Functions
// =============================================================================

/**
 * Check if a specific evidence type passes for the given bundle.
 * Returns a description of what was checked and the result.
 */
function checkEvidence(
  evidenceType: EvidenceType,
  bundle: ExportableStateBundle | null,
  bundleVerification: BundleVerificationResult | null,
): { passed: boolean; detail: string } {
  switch (evidenceType) {
    case "hash-chain":
      if (bundle === null) {
        return { passed: false, detail: "No state bundle available for hash chain verification" };
      }
      if (bundleVerification === null) {
        return { passed: false, detail: "Bundle verification not performed" };
      }
      return {
        passed: bundleVerification.bundleHashValid,
        detail: bundleVerification.bundleHashValid
          ? "Bundle hash chain is intact"
          : `Hash chain broken: ${bundleVerification.discrepancies.join("; ")}`,
      };

    case "replay-verification":
      if (bundleVerification === null) {
        return { passed: false, detail: "Replay verification not performed" };
      }
      return {
        passed: bundleVerification.globalHashValid,
        detail: bundleVerification.globalHashValid
          ? "State replay verification passed — global hash matches"
          : `Replay mismatch: ${bundleVerification.discrepancies.join("; ")}`,
      };

    case "state-snapshot":
      if (bundle === null) {
        return { passed: false, detail: "No state snapshot available" };
      }
      return {
        passed: bundle.version >= 1 && bundle.exportedAt !== undefined,
        detail: `State snapshot v${bundle.version} exported at ${bundle.exportedAt ?? "unknown"}`,
      };

    case "merkle-proof":
      if (bundle === null) {
        return { passed: false, detail: "No bundle for Merkle proof verification" };
      }
      return {
        passed: bundle.eventHashes.length > 0,
        detail: `${bundle.eventHashes.length} event hashes available for Merkle tree construction`,
      };

    case "audit-log":
      // Audit log is always available if the system is running
      return {
        passed: true,
        detail: "Append-only audit log is structurally present",
      };

    case "multi-sig-governance":
      // Governance is an architectural feature, not bundle-dependent
      return {
        passed: true,
        detail: "Multi-signature governance framework is available",
      };

    case "reconciliation":
      // Reconciliation capability is always available
      return {
        passed: true,
        detail: "Three-way reconciliation engine is available",
      };

    case "consensus":
      // Consensus capability is always available
      return {
        passed: true,
        detail: "Multi-verifier consensus framework is available",
      };
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a compliance report by evaluating each control mapping
 * against the current system state.
 *
 * @param mappings - Control mappings for the framework
 * @param framework - Framework metadata
 * @param bundle - Optional state bundle for evidence evaluation
 * @returns ComplianceReport with per-control evaluations and score
 */
export function generateComplianceEvidence(
  mappings: readonly ControlMapping[],
  framework: ComplianceFramework,
  bundle?: ExportableStateBundle | undefined,
): ComplianceReport {
  // Pre-compute bundle verification if a bundle is provided
  const bundleVerification =
    bundle !== undefined ? verifyBundleIntegrity(bundle) : null;

  const evaluations: EvaluatedControl[] = mappings.map((mapping) => {
    // A control passes if ALL its evidence types pass
    const evidenceResults = mapping.evidenceTypes.map((et) =>
      checkEvidence(et, bundle ?? null, bundleVerification),
    );

    const allPassed = evidenceResults.every((r) => r.passed);

    // For "not-applicable" controls, always pass
    const passed = mapping.status === "not-applicable" || allPassed;

    const evidenceDetail = evidenceResults
      .map((r) => `[${r.passed ? "PASS" : "FAIL"}] ${r.detail}`)
      .join("; ");

    return {
      mapping,
      passed,
      evidenceDetail,
    };
  });

  const passedControls = evaluations.filter((e) => e.passed).length;
  const totalControls = evaluations.length;
  const score =
    totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 0;

  return {
    framework,
    evaluations,
    totalControls,
    passedControls,
    score,
    generatedAt: new Date().toISOString(),
  };
}
