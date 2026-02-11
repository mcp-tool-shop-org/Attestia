/**
 * @attestia/verify — GlobalStateHash computation.
 *
 * Produces a single content-addressed hash covering all subsystem state.
 *
 * Algorithm:
 * 1. Canonicalize each subsystem snapshot (RFC 8785 / JCS)
 * 2. SHA-256 each canonical form → subsystem hash
 * 3. Canonicalize the ordered tuple of subsystem hashes
 * 4. SHA-256 the combined canonical form → GlobalStateHash
 *
 * Properties:
 * - Deterministic: same inputs → same hash (always)
 * - Content-addressed: any change in any subsystem → different hash
 * - Auditable: subsystem hashes preserved for pinpointing divergence
 */

import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type { LedgerSnapshot } from "@attestia/ledger";
import type { RegistrarSnapshotV1 } from "@attestia/registrum";
import type { GlobalStateHash } from "./types.js";

/**
 * Compute the SHA-256 hash of a canonical JSON representation.
 */
function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute the canonical hash of a ledger snapshot.
 *
 * Strips the `createdAt` field (wall-clock metadata) before hashing,
 * since it changes between snapshot calls and is not structural state.
 * Canonicalizes the remaining fields (RFC 8785) then SHA-256 hashes.
 */
export function hashLedgerSnapshot(snapshot: LedgerSnapshot): string {
  const { createdAt: _, ...structural } = snapshot;
  const canonical = canonicalize(structural);
  return sha256(canonical);
}

/**
 * Compute the canonical hash of a registrum snapshot.
 *
 * Canonicalizes the snapshot (RFC 8785) then SHA-256 hashes it.
 */
export function hashRegistrumSnapshot(snapshot: RegistrarSnapshotV1): string {
  const canonical = canonicalize(snapshot);
  return sha256(canonical);
}

/**
 * Compute the GlobalStateHash from subsystem snapshots.
 *
 * This is the top-level function that ties all subsystems together
 * into a single content-addressed digest.
 *
 * @param ledgerSnapshot - Current ledger state
 * @param registrumSnapshot - Current registrum state
 * @param chainHashes - Optional per-chain observer hashes (backward compat: omitted = unchanged)
 * @returns GlobalStateHash with combined hash and subsystem hashes
 */
export function computeGlobalStateHash(
  ledgerSnapshot: LedgerSnapshot,
  registrumSnapshot: RegistrarSnapshotV1,
  chainHashes?: Record<string, string>,
): GlobalStateHash {
  // Step 1-2: Hash each subsystem independently
  const ledgerHash = hashLedgerSnapshot(ledgerSnapshot);
  const registrumHash = hashRegistrumSnapshot(registrumSnapshot);

  // Step 3-4: Combine subsystem hashes into a single digest
  // Use canonical JSON of sorted subsystem hashes for determinism
  // When chainHashes are provided, they are included in the combined hash
  const combinedData: Record<string, unknown> = {
    ledger: ledgerHash,
    registrum: registrumHash,
  };

  if (chainHashes && Object.keys(chainHashes).length > 0) {
    combinedData.chains = chainHashes;
  }

  const combined = canonicalize(combinedData);
  const globalHash = sha256(combined);

  return {
    hash: globalHash,
    computedAt: new Date().toISOString(),
    subsystems: {
      ledger: ledgerHash,
      registrum: registrumHash,
      ...(chainHashes && Object.keys(chainHashes).length > 0
        ? { chains: chainHashes }
        : {}),
    },
  };
}
