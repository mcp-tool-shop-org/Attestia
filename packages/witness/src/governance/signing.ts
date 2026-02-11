/**
 * Canonical Signing and Signature Aggregation
 *
 * Deterministic payload construction and multi-signature aggregation
 * for N-of-M governance quorum enforcement.
 *
 * Design:
 * - RFC 8785 (JCS) canonical JSON serialization
 * - SHA-256 content addressing
 * - Lexicographic signature ordering for determinism
 * - Quorum verification before aggregation
 */

import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type { AttestationPayload } from "../types.js";
import type { GovernancePolicy, QuorumResult } from "./types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * A single signer's signature contribution.
 */
export interface SignerSignature {
  /** Signer's XRPL address */
  readonly address: string;

  /** Hex-encoded signature bytes */
  readonly signature: string;

  /** ISO 8601 timestamp when signature was created */
  readonly signedAt: string;
}

/**
 * An aggregated multi-signature payload.
 */
export interface AggregatedSignature {
  /** The canonical signing payload hash */
  readonly payloadHash: string;

  /** All individual signatures, ordered lexicographically by address */
  readonly signatures: readonly SignerSignature[];

  /** Quorum check result */
  readonly quorum: QuorumResult;

  /** ISO 8601 timestamp when aggregation was completed */
  readonly aggregatedAt: string;
}

// =============================================================================
// Canonical Signing Payload
// =============================================================================

/**
 * Build a canonical signing payload from an attestation and governance policy.
 *
 * The payload is deterministic: same attestation + same policy → same bytes.
 * Uses RFC 8785 (JCS) for canonical JSON, then SHA-256 for the hash.
 *
 * @param attestation The attestation payload to sign
 * @param policy The governance policy at the time of signing
 * @returns SHA-256 hash of the canonical signing payload
 */
export function buildCanonicalSigningPayload(
  attestation: AttestationPayload,
  policy: GovernancePolicy,
): string {
  const payload = {
    attestationHash: attestation.hash,
    attestationTimestamp: attestation.timestamp,
    policyId: policy.id,
    policyVersion: policy.version,
    quorum: policy.quorum,
    signers: policy.signers.map((s) => s.address).sort(),
  };

  const canonical = canonicalize(payload);
  return createHash("sha256").update(canonical).digest("hex");
}

// =============================================================================
// Signature Ordering
// =============================================================================

/**
 * Order signatures lexicographically by signer address.
 *
 * This ensures deterministic ordering regardless of the order
 * in which signatures were collected.
 *
 * @param signatures Unordered signatures
 * @returns Signatures ordered by address (ascending)
 */
export function orderSignatures(
  signatures: readonly SignerSignature[],
): readonly SignerSignature[] {
  return [...signatures].sort((a, b) => a.address.localeCompare(b.address));
}

// =============================================================================
// Signature Aggregation
// =============================================================================

/**
 * Aggregate individual signatures into a multi-signature payload.
 *
 * Verifies:
 * 1. No duplicate signatures (same address)
 * 2. All signers are in the policy
 * 3. Quorum is met
 *
 * @param signatures Individual signer signatures
 * @param policy The governance policy to verify against
 * @param payloadHash The canonical signing payload hash
 * @returns Aggregated signature with quorum result
 * @throws If quorum is not met
 * @throws If duplicate signatures are found
 */
export function aggregateSignatures(
  signatures: readonly SignerSignature[],
  policy: GovernancePolicy,
  payloadHash: string,
): AggregatedSignature {
  // Check for duplicate signers
  const addresses = signatures.map((s) => s.address);
  const uniqueAddresses = new Set(addresses);
  if (uniqueAddresses.size !== addresses.length) {
    const duplicates = addresses.filter(
      (addr, idx) => addresses.indexOf(addr) !== idx,
    );
    throw new Error(
      `Duplicate signatures from: ${[...new Set(duplicates)].join(", ")}`,
    );
  }

  // Verify all signers are in the policy
  const policyAddresses = new Set(policy.signers.map((s) => s.address));
  for (const addr of addresses) {
    if (!policyAddresses.has(addr)) {
      throw new Error(`Signer ${addr} is not in the governance policy`);
    }
  }

  // Check quorum
  const totalWeight = signatures.reduce((sum, sig) => {
    const signer = policy.signers.find((s) => s.address === sig.address);
    return sum + (signer?.weight ?? 0);
  }, 0);

  const allPolicyAddresses = policy.signers.map((s) => s.address);
  const missingAddresses = allPolicyAddresses.filter((addr) => !uniqueAddresses.has(addr));

  const quorum: QuorumResult = {
    met: totalWeight >= policy.quorum,
    totalWeight,
    requiredWeight: policy.quorum,
    signerAddresses: addresses,
    missingAddresses,
  };

  if (!quorum.met) {
    throw new Error(
      `Quorum not met: ${totalWeight} of ${policy.quorum} required weight ` +
      `(${addresses.length} of ${policy.signers.length} signers)`,
    );
  }

  return {
    payloadHash,
    signatures: orderSignatures(signatures),
    quorum,
    aggregatedAt: new Date().toISOString(),
  };
}
