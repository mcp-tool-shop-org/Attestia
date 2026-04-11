/**
 * @attestia/verify — Deterministic replay verification.
 *
 * Given two snapshots (original system state), this module:
 * 1. Computes the GlobalStateHash of the original snapshots
 * 2. Replays the ledger from its snapshot (restoring via Ledger.fromSnapshot)
 * 3. Replays the registrum from its snapshot (restoring via StructuralRegistrar.fromSnapshot)
 * 4. Takes fresh snapshots of the replayed state
 * 5. Computes the GlobalStateHash of the replayed state
 * 6. Compares: if hashes match, the state is deterministically verified
 *
 * This proves that the system's persistence is lossless and that
 * the same structural state produces the same content-addressed hash.
 */

import { Ledger } from "@attestia/ledger";
import { StructuralRegistrar, INITIAL_INVARIANTS } from "@attestia/registrum";
import type {
  ReplayInput,
  ReplayResult,
  VerificationResult,
  VerificationDiscrepancy,
} from "./types.js";
import {
  computeGlobalStateHash,
  hashLedgerSnapshot,
  hashRegistrumSnapshot,
} from "./global-state-hash.js";

/**
 * Verify system state by replaying from snapshots.
 *
 * This is the core verification function. It:
 * 1. Computes the GlobalStateHash of the provided snapshots
 * 2. Replays both subsystems from their snapshots
 * 3. Takes fresh snapshots of the replayed state
 * 4. Computes the GlobalStateHash of the replayed state
 * 5. Compares the two hashes
 *
 * If the hashes match, the system's persistence is proven lossless.
 *
 * @param input - The snapshots to verify
 * @returns ReplayResult with verdict and any discrepancies
 */
export function verifyByReplay(input: ReplayInput): ReplayResult {
  const discrepancies: VerificationDiscrepancy[] = [];

  // Step 1: Hash the original snapshots
  const originalHash = computeGlobalStateHash(
    input.ledgerSnapshot,
    input.registrumSnapshot,
  );

  // Step 2: Replay ledger from snapshot
  const replayedLedger = Ledger.fromSnapshot(input.ledgerSnapshot);
  const replayedLedgerSnapshot = replayedLedger.snapshot();

  // Step 3: Replay registrum from snapshot
  const replayedRegistrar = StructuralRegistrar.fromSnapshot(
    input.registrumSnapshot,
    {
      mode: input.registrumSnapshot.mode as "legacy" | "registry",
      invariants: INITIAL_INVARIANTS,
    },
  );
  const replayedRegistrumSnapshot = replayedRegistrar.snapshot();

  // Step 4: Hash the replayed snapshots
  const replayedHash = computeGlobalStateHash(
    replayedLedgerSnapshot,
    replayedRegistrumSnapshot,
  );

  // Step 5: Compare subsystem hashes
  const ledgerOriginalHash = hashLedgerSnapshot(input.ledgerSnapshot);
  const ledgerReplayedHash = hashLedgerSnapshot(replayedLedgerSnapshot);

  if (ledgerOriginalHash !== ledgerReplayedHash) {
    discrepancies.push({
      subsystem: "ledger",
      expected: ledgerOriginalHash,
      actual: ledgerReplayedHash,
      description: "Ledger snapshot hash changed after replay",
    });
  }

  const registrumOriginalHash = hashRegistrumSnapshot(input.registrumSnapshot);
  const registrumReplayedHash = hashRegistrumSnapshot(replayedRegistrumSnapshot);

  if (registrumOriginalHash !== registrumReplayedHash) {
    discrepancies.push({
      subsystem: "registrum",
      expected: registrumOriginalHash,
      actual: registrumReplayedHash,
      description: "Registrum snapshot hash changed after replay",
    });
  }

  // Step 6: Compare global hash
  if (originalHash.hash !== replayedHash.hash) {
    discrepancies.push({
      subsystem: "global",
      expected: originalHash.hash,
      actual: replayedHash.hash,
      description: "GlobalStateHash changed after replay",
    });
  }

  // Step 7: If expectedHash provided, verify against it
  if (input.expectedHash !== undefined && originalHash.hash !== input.expectedHash) {
    discrepancies.push({
      subsystem: "global",
      expected: input.expectedHash,
      actual: originalHash.hash,
      description: "GlobalStateHash does not match expected hash",
    });
  }

  return {
    verdict: discrepancies.length === 0 ? "PASS" : "FAIL",
    replayedHash,
    originalHash,
    discrepancies,
  };
}

/**
 * Quick verification: compute GlobalStateHash and compare to expected.
 *
 * Does NOT replay — just hashes the provided snapshots and compares.
 * Use this for fast checks when you trust the snapshots are well-formed.
 *
 * @param input - The snapshots to verify
 * @param expectedHash - The expected GlobalStateHash
 * @returns VerificationResult with verdict
 */
export function verifyHash(
  input: Pick<ReplayInput, "ledgerSnapshot" | "registrumSnapshot">,
  expectedHash: string,
): VerificationResult {
  const globalHash = computeGlobalStateHash(
    input.ledgerSnapshot,
    input.registrumSnapshot,
  );

  const discrepancies: VerificationDiscrepancy[] = [];

  if (globalHash.hash !== expectedHash) {
    discrepancies.push({
      subsystem: "global",
      expected: expectedHash,
      actual: globalHash.hash,
      description: "GlobalStateHash does not match expected",
    });
  }

  return {
    verdict: discrepancies.length === 0 ? "PASS" : "FAIL",
    globalHash,
    discrepancies,
    verifiedAt: new Date().toISOString(),
  };
}
