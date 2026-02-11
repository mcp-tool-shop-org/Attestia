/**
 * @attestia/verify — Multi-Verifier Consensus.
 *
 * Aggregates multiple independent VerifierReports into a single
 * ConsensusResult using majority rule.
 *
 * Design:
 * - Pure functions, no I/O
 * - Majority rule: >50% PASS → consensus PASS
 * - Minimum verifier threshold (quorum) before consensus is valid
 * - Tracks dissenting verifiers for audit trail
 * - Deterministic: same reports → same consensus (minus timestamp)
 */

import type {
  VerifierReport,
  ConsensusResult,
  VerificationVerdict,
} from "./types.js";

// =============================================================================
// Public API
// =============================================================================

/**
 * Check whether enough verifier reports have been submitted
 * for consensus to be meaningful.
 *
 * @param reports - All submitted verifier reports
 * @param minimumVerifiers - Minimum number of verifiers required
 * @returns true if the minimum threshold is met
 */
export function isConsensusReached(
  reports: readonly VerifierReport[],
  minimumVerifiers: number,
): boolean {
  return reports.length >= minimumVerifiers;
}

/**
 * Aggregate multiple verifier reports into a consensus result.
 *
 * Rules:
 * - If >50% of verifiers report PASS, consensus is PASS
 * - If exactly 50/50, consensus is FAIL (conservative)
 * - Verifiers who disagree with the majority are listed as dissenters
 * - If no reports are provided, verdict is FAIL with 0 agreement
 *
 * @param reports - All submitted verifier reports
 * @param minimumVerifiers - Minimum verifiers before consensus is valid (default: 1)
 * @returns ConsensusResult with verdict, counts, and dissenters
 */
export function aggregateVerifierReports(
  reports: readonly VerifierReport[],
  minimumVerifiers: number = 1,
): ConsensusResult {
  const total = reports.length;

  if (total === 0) {
    return {
      verdict: "FAIL",
      totalVerifiers: 0,
      passCount: 0,
      failCount: 0,
      agreementRatio: 0,
      quorumReached: false,
      dissenters: [],
      consensusAt: new Date().toISOString(),
    };
  }

  const passCount = reports.filter((r) => r.verdict === "PASS").length;
  const failCount = total - passCount;

  // Majority rule: strictly more than 50% must PASS for consensus PASS
  const verdict: VerificationVerdict =
    passCount > total / 2 ? "PASS" : "FAIL";

  const quorumReached = total >= minimumVerifiers;

  // Dissenters are those who disagree with the majority verdict
  const dissenters = reports
    .filter((r) => r.verdict !== verdict)
    .map((r) => r.verifierId);

  // Agreement ratio: proportion of verifiers who agree with the verdict
  const majorityCount = verdict === "PASS" ? passCount : failCount;
  const agreementRatio = majorityCount / total;

  return {
    verdict,
    totalVerifiers: total,
    passCount,
    failCount,
    agreementRatio,
    quorumReached,
    dissenters,
    consensusAt: new Date().toISOString(),
  };
}
