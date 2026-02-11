/**
 * @attestia/verify — Types for deterministic verification.
 *
 * These types define the verification protocol:
 * - GlobalStateHash: content-addressed hash combining all subsystem snapshots
 * - VerificationResult: pass/fail verdict with structured evidence
 * - ReplayContext: inputs needed to deterministically reproduce state
 */

import type { LedgerSnapshot } from "@attestia/ledger";
import type { RegistrarSnapshotV1 } from "@attestia/registrum";

// =============================================================================
// Global State Hash
// =============================================================================

/**
 * A GlobalStateHash is a single SHA-256 digest that covers
 * the entire system state at a point in time.
 *
 * Computed from canonical JSON of all subsystem snapshots.
 * If any bit of any subsystem changes, the hash changes.
 */
export interface GlobalStateHash {
  /** SHA-256 hex digest (64 characters, lowercase) */
  readonly hash: string;

  /** ISO 8601 timestamp of when the hash was computed */
  readonly computedAt: string;

  /** Individual subsystem hashes for audit trail */
  readonly subsystems: {
    readonly ledger: string;
    readonly registrum: string;
    /** Optional per-chain observer hashes (added in Phase 11) */
    readonly chains?: Record<string, string>;
  };
}

// =============================================================================
// Verification
// =============================================================================

/**
 * Verdict from a verification check.
 */
export type VerificationVerdict = "PASS" | "FAIL";

/**
 * A single discrepancy found during verification.
 */
export interface VerificationDiscrepancy {
  /** Which subsystem had the mismatch */
  readonly subsystem: "ledger" | "registrum" | "global";

  /** What was expected */
  readonly expected: string;

  /** What was actually found */
  readonly actual: string;

  /** Human-readable description */
  readonly description: string;
}

/**
 * Result of a verification operation.
 */
export interface VerificationResult {
  /** Overall verdict */
  readonly verdict: VerificationVerdict;

  /** The GlobalStateHash that was verified */
  readonly globalHash: GlobalStateHash;

  /** Any discrepancies found (empty if verdict = PASS) */
  readonly discrepancies: readonly VerificationDiscrepancy[];

  /** ISO 8601 timestamp of verification */
  readonly verifiedAt: string;
}

// =============================================================================
// Replay
// =============================================================================

/**
 * Replay input: the raw events/actions needed to reproduce state.
 */
export interface ReplayInput {
  /** Ledger snapshot to verify against */
  readonly ledgerSnapshot: LedgerSnapshot;

  /** Registrum snapshot to verify against */
  readonly registrumSnapshot: RegistrarSnapshotV1;

  /** Expected GlobalStateHash (optional — if provided, verifies match) */
  readonly expectedHash?: string;
}

/**
 * Result of replaying state from snapshots.
 */
export interface ReplayResult {
  /** Whether replay produced identical state */
  readonly verdict: VerificationVerdict;

  /** Hash of the replayed state */
  readonly replayedHash: GlobalStateHash;

  /** Hash of the original state */
  readonly originalHash: GlobalStateHash;

  /** Discrepancies found during replay */
  readonly discrepancies: readonly VerificationDiscrepancy[];
}
