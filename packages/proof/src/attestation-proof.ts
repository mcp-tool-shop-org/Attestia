/**
 * @attestia/proof — Attestation Proof Packaging.
 *
 * Wraps an attestation with a Merkle inclusion proof into a
 * self-contained, independently verifiable proof package.
 *
 * Design:
 * - Self-contained: third parties verify with ONLY this package
 * - No access to the full event store needed
 * - packageHash covers all fields for tamper evidence
 * - Uses SHA-256 + RFC 8785 canonical JSON (same as rest of Attestia)
 * - All pure functions, no I/O
 */

import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { MerkleTree } from "./merkle-tree.js";
import type { AttestationProofPackage, MerkleProof } from "./types.js";

// =============================================================================
// Internal Helpers
// =============================================================================

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute the package hash from all fields except packageHash itself.
 * This provides tamper evidence for the entire proof package.
 */
function computePackageHash(
  attestation: unknown,
  attestationHash: string,
  merkleRoot: string,
  inclusionProof: MerkleProof,
  packagedAt: string,
): string {
  const data = {
    version: 1,
    attestation,
    attestationHash,
    merkleRoot,
    inclusionProof,
    packagedAt,
  };
  return sha256(canonicalize(data));
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Package an attestation with a Merkle inclusion proof.
 *
 * Creates a self-contained proof package that a third party can
 * independently verify without access to the full event store.
 *
 * @param attestation - The attestation data to prove
 * @param eventHashes - All event hashes in the system (ordered)
 * @param tree - Pre-built Merkle tree over eventHashes
 * @param attestationIndex - Index of this attestation's hash in eventHashes
 * @returns AttestationProofPackage or null if proof generation fails
 */
export function packageAttestationProof(
  attestation: unknown,
  eventHashes: readonly string[],
  tree: MerkleTree,
  attestationIndex: number,
): AttestationProofPackage | null {
  const root = tree.getRoot();
  if (root === null) {
    return null;
  }

  const inclusionProof = tree.getProof(attestationIndex);
  if (inclusionProof === null) {
    return null;
  }

  // Hash the attestation data using canonical JSON
  const attestationHash = sha256(canonicalize(attestation));

  // Verify that the hash at this index matches what we expect
  const expectedHash = eventHashes[attestationIndex];
  if (expectedHash === undefined) {
    return null;
  }

  const packagedAt = new Date().toISOString();

  const packageHash = computePackageHash(
    attestation,
    attestationHash,
    root,
    inclusionProof,
    packagedAt,
  );

  return {
    version: 1,
    attestation,
    attestationHash,
    merkleRoot: root,
    inclusionProof,
    packagedAt,
    packageHash,
  };
}

/**
 * Verify an attestation proof package.
 *
 * Checks:
 * 1. attestationHash matches recomputed hash of attestation data
 * 2. Merkle inclusion proof is valid (leaf → root path)
 * 3. packageHash matches recomputed hash of all fields
 * 4. merkleRoot in package matches root in inclusion proof
 *
 * @param pkg - The proof package to verify
 * @returns true if all checks pass
 */
export function verifyAttestationProof(
  pkg: AttestationProofPackage,
): boolean {
  // Check 1: Recompute attestation hash
  const recomputedAttestationHash = sha256(canonicalize(pkg.attestation));
  if (recomputedAttestationHash !== pkg.attestationHash) {
    return false;
  }

  // Check 2: Verify Merkle inclusion proof
  if (!MerkleTree.verifyProof(pkg.inclusionProof)) {
    return false;
  }

  // Check 3: merkleRoot consistency
  if (pkg.merkleRoot !== pkg.inclusionProof.root) {
    return false;
  }

  // Check 4: Recompute package hash
  const recomputedPackageHash = computePackageHash(
    pkg.attestation,
    pkg.attestationHash,
    pkg.merkleRoot,
    pkg.inclusionProof,
    pkg.packagedAt,
  );
  if (recomputedPackageHash !== pkg.packageHash) {
    return false;
  }

  return true;
}
