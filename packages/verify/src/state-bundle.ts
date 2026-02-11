/**
 * @attestia/verify — Exportable State Bundle.
 *
 * Assembles all subsystem snapshots into a self-contained,
 * independently verifiable bundle. External verifiers download
 * this bundle and verify without trusting the operator.
 *
 * Design:
 * - Pure functions, no I/O
 * - All hashing uses SHA-256 + RFC 8785 canonical JSON
 * - bundleHash covers all internal hashes for tamper evidence
 * - Backward compatible: chainHashes are optional
 */

import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type { LedgerSnapshot } from "@attestia/ledger";
import type { RegistrarSnapshotV1 } from "@attestia/registrum";
import type {
  ExportableStateBundle,
  BundleVerificationResult,
} from "./types.js";
import { computeGlobalStateHash } from "./global-state-hash.js";

// =============================================================================
// Internal Helpers
// =============================================================================

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute the bundle hash from the bundle's internal data.
 *
 * The bundle hash covers:
 * - The globalStateHash digest
 * - All event hashes (ordered)
 * - Chain hashes (if present)
 *
 * This provides tamper evidence for the bundle itself.
 */
function computeBundleHash(
  globalHash: string,
  eventHashes: readonly string[],
  chainHashes?: Record<string, string>,
): string {
  const data: Record<string, unknown> = {
    globalHash,
    eventHashes: [...eventHashes],
  };

  if (chainHashes && Object.keys(chainHashes).length > 0) {
    data.chainHashes = chainHashes;
  }

  return sha256(canonicalize(data));
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create an exportable state bundle from subsystem snapshots.
 *
 * Assembles all system state into a self-contained bundle that
 * can be independently verified by external parties.
 *
 * @param ledgerSnapshot - Current ledger state
 * @param registrumSnapshot - Current registrum state
 * @param eventHashes - SHA-256 hashes of all events (ordered)
 * @param chainHashes - Optional per-chain observer hashes
 * @returns ExportableStateBundle ready for export
 */
export function createStateBundle(
  ledgerSnapshot: LedgerSnapshot,
  registrumSnapshot: RegistrarSnapshotV1,
  eventHashes: readonly string[],
  chainHashes?: Record<string, string>,
): ExportableStateBundle {
  const globalStateHash = computeGlobalStateHash(
    ledgerSnapshot,
    registrumSnapshot,
    chainHashes,
  );

  const bundleHash = computeBundleHash(
    globalStateHash.hash,
    eventHashes,
    chainHashes,
  );

  return {
    version: 1,
    ledgerSnapshot,
    registrumSnapshot,
    globalStateHash,
    eventHashes,
    ...(chainHashes && Object.keys(chainHashes).length > 0
      ? { chainHashes }
      : {}),
    exportedAt: new Date().toISOString(),
    bundleHash,
  };
}

/**
 * Verify a state bundle's internal consistency.
 *
 * Checks:
 * 1. bundleHash matches recomputed hash from contents
 * 2. globalStateHash matches recomputed hash from snapshots
 *
 * Does NOT perform replay verification (use VerifierNode for that).
 *
 * @param bundle - The state bundle to verify
 * @returns BundleVerificationResult with verdict and discrepancies
 */
export function verifyBundleIntegrity(
  bundle: ExportableStateBundle,
): BundleVerificationResult {
  const discrepancies: string[] = [];

  // Check 1: Recompute bundleHash from contents
  const expectedBundleHash = computeBundleHash(
    bundle.globalStateHash.hash,
    bundle.eventHashes,
    bundle.chainHashes,
  );
  const bundleHashValid = bundle.bundleHash === expectedBundleHash;

  if (!bundleHashValid) {
    discrepancies.push(
      `Bundle hash mismatch: expected ${expectedBundleHash}, got ${bundle.bundleHash}`,
    );
  }

  // Check 2: Recompute globalStateHash from snapshots
  const recomputedGlobalHash = computeGlobalStateHash(
    bundle.ledgerSnapshot,
    bundle.registrumSnapshot,
    bundle.chainHashes,
  );
  const globalHashValid =
    bundle.globalStateHash.hash === recomputedGlobalHash.hash;

  if (!globalHashValid) {
    discrepancies.push(
      `GlobalStateHash mismatch: bundle says ${bundle.globalStateHash.hash}, ` +
        `recomputed ${recomputedGlobalHash.hash}`,
    );
  }

  // Check 3: Subsystem hashes consistent
  if (
    bundle.globalStateHash.subsystems.ledger !==
    recomputedGlobalHash.subsystems.ledger
  ) {
    discrepancies.push(
      `Ledger hash mismatch: bundle says ${bundle.globalStateHash.subsystems.ledger}, ` +
        `recomputed ${recomputedGlobalHash.subsystems.ledger}`,
    );
  }

  if (
    bundle.globalStateHash.subsystems.registrum !==
    recomputedGlobalHash.subsystems.registrum
  ) {
    discrepancies.push(
      `Registrum hash mismatch: bundle says ${bundle.globalStateHash.subsystems.registrum}, ` +
        `recomputed ${recomputedGlobalHash.subsystems.registrum}`,
    );
  }

  return {
    verdict: discrepancies.length === 0 ? "PASS" : "FAIL",
    bundleHashValid,
    globalHashValid,
    discrepancies,
    verifiedAt: new Date().toISOString(),
  };
}
