/**
 * Deterministic Serialization (E.2)
 *
 * Ensures snapshots are bitwise deterministic.
 *
 * Design rules:
 * - Canonical field ordering
 * - Stable array ordering (explicit sort)
 * - No environment-dependent output
 * - If two snapshots differ for the same structural state → bug, not tolerance
 */

import type { RegistrarSnapshotV1 } from "./snapshot.js";

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize a snapshot to deterministic JSON.
 *
 * Guarantees:
 * - Canonical key ordering (sorted alphabetically)
 * - Stable array ordering (state_ids by orderIndex)
 * - No environment-dependent output
 * - Identical input → identical output (bitwise)
 *
 * @param snapshot - The snapshot to serialize
 * @param pretty - Whether to use 2-space indentation (default: false)
 * @returns Deterministic JSON string
 */
export function serializeSnapshot(
  snapshot: RegistrarSnapshotV1,
  pretty: boolean = false
): string {
  // Build canonical representation
  const canonical = buildCanonicalObject(snapshot);

  // Serialize with deterministic key ordering
  return JSON.stringify(
    canonical,
    null,
    pretty ? 2 : undefined
  );
}

/**
 * Build a canonical object representation for serialization.
 *
 * This ensures:
 * - Fields are in alphabetical order
 * - Arrays are in canonical order
 * - Nested objects follow the same rules
 */
function buildCanonicalObject(snapshot: RegistrarSnapshotV1): Record<string, unknown> {
  // Get state_ids sorted by their order index (already canonical in snapshot)
  // The snapshot.state_ids should already be in order, but we verify
  const stateIdsByOrder = [...snapshot.state_ids].sort((a, b) => {
    const orderA = snapshot.ordering.assigned[a] ?? 0;
    const orderB = snapshot.ordering.assigned[b] ?? 0;
    return orderA - orderB;
  });

  // Build lineage with sorted keys
  const lineageKeys = Object.keys(snapshot.lineage).sort();
  const lineage: Record<string, string | null> = {};
  for (const key of lineageKeys) {
    lineage[key] = snapshot.lineage[key] ?? null;
  }

  // Build ordering.assigned with sorted keys
  const assignedKeys = Object.keys(snapshot.ordering.assigned).sort();
  const assigned: Record<string, number> = {};
  for (const key of assignedKeys) {
    assigned[key] = snapshot.ordering.assigned[key] ?? 0;
  }

  // Build canonical object with alphabetically ordered fields
  // JSON.stringify preserves insertion order in modern JS
  return {
    lineage,
    mode: snapshot.mode,
    ordering: {
      assigned,
      max_index: snapshot.ordering.max_index,
    },
    registry_hash: snapshot.registry_hash,
    state_ids: stateIdsByOrder,
    version: snapshot.version,
  };
}

// =============================================================================
// Deserialization
// =============================================================================

/**
 * Deserialize a JSON string to a snapshot.
 *
 * This is the inverse of serializeSnapshot.
 * Does NOT validate the snapshot - use validateSnapshot for that.
 *
 * @param json - The JSON string to deserialize
 * @returns The deserialized snapshot (unvalidated)
 */
export function deserializeSnapshot(json: string): unknown {
  return JSON.parse(json);
}

// =============================================================================
// Checksum Computation (Non-Cryptographic)
// =============================================================================

/**
 * Compute a 32-bit checksum of a snapshot for integrity verification.
 *
 * IMPORTANT DISTINCTION:
 * - This is a CHECKSUM (djb2, non-cryptographic) for fast integrity checking
 * - For cryptographic attestation, use attestation/generator.ts (SHA-256)
 *
 * Use cases:
 * - Detecting corruption or accidental modification
 * - Quick equality checks
 * - Ordering verification
 *
 * NOT suitable for:
 * - Security/attestation (use SHA-256 via attestation module)
 * - Collision resistance
 * - External witnessing
 *
 * @param snapshot - The snapshot to checksum
 * @returns An 8-character hex string (32-bit checksum)
 */
export function computeSnapshotChecksum32(snapshot: RegistrarSnapshotV1): string {
  const json = serializeSnapshot(snapshot, false);
  return djb2Checksum(json);
}

/**
 * @deprecated Use computeSnapshotChecksum32 instead.
 * Kept for backwards compatibility during transition.
 */
export function computeSnapshotHash(snapshot: RegistrarSnapshotV1): string {
  return computeSnapshotChecksum32(snapshot);
}

/**
 * DJB2 checksum algorithm (non-cryptographic).
 *
 * Properties:
 * - Fast computation
 * - 32-bit output
 * - Good distribution for integrity checking
 * - NOT collision-resistant (not suitable for security)
 */
function djb2Checksum(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit
  }
  return hash.toString(16).padStart(8, "0");
}
