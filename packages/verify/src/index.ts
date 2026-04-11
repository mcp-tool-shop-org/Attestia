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

// Types
export type {
  GlobalStateHash,
  VerificationVerdict,
  VerificationDiscrepancy,
  VerificationResult,
  ReplayInput,
  ReplayResult,
} from "./types.js";
