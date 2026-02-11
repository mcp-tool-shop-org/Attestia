/**
 * @attestia/verify — Deterministic replay verification for Attestia.
 *
 * Ties the ledger and registrum together into a single verifiable
 * content-addressed GlobalStateHash. Provides replay-based verification
 * to prove persistence is lossless and deterministic.
 *
 * Core exports:
 * - computeGlobalStateHash — combine subsystem snapshots into one hash
 * - verifyByReplay — full replay-based verification
 * - verifyHash — quick hash comparison (no replay)
 */

// GlobalStateHash computation
export {
  computeGlobalStateHash,
  hashLedgerSnapshot,
  hashRegistrumSnapshot,
} from "./global-state-hash.js";

// Replay verification
export { verifyByReplay, verifyHash } from "./replay.js";

// Multi-chain replay audit
export {
  computeChainHashChain,
  computeCombinedHash,
  auditMultiChainReplay,
} from "./multi-chain-replay.js";

// State bundle (external verification)
export {
  createStateBundle,
  verifyBundleIntegrity,
} from "./state-bundle.js";

// Verifier node (external verification)
export { runVerification, VerifierNode } from "./verifier-node.js";

// Cross-chain invariants
export {
  checkAssetConservation,
  checkNoDuplicateSettlement,
  checkEventOrdering,
  checkGovernanceConsistency,
  auditCrossChainInvariants,
} from "./cross-chain-invariants.js";

// Types
export type {
  GlobalStateHash,
  VerificationVerdict,
  VerificationDiscrepancy,
  VerificationResult,
  ReplayInput,
  ReplayResult,
  ExportableStateBundle,
  BundleVerificationResult,
  VerifierConfig,
  SubsystemCheck,
  VerifierReport,
  ConsensusResult,
} from "./types.js";

export type {
  ChainEvent,
  ChainReplayResult,
  MultiChainAuditResult,
} from "./multi-chain-replay.js";

export type {
  InvariantEvent,
  InvariantCheckResult,
  InvariantAuditResult,
} from "./cross-chain-invariants.js";
