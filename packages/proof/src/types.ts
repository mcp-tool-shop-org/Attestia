/**
 * @attestia/proof — Core types.
 *
 * Types for Merkle trees, inclusion proofs, and attestation proof packaging.
 * All hashes are SHA-256 hex strings (64 characters, lowercase).
 */

// =============================================================================
// Merkle Tree Types
// =============================================================================

/**
 * Direction of a sibling node in a Merkle proof path.
 * - "left": sibling is on the left, proof node is on the right
 * - "right": sibling is on the right, proof node is on the left
 */
export type SiblingDirection = "left" | "right";

/**
 * A single step in a Merkle inclusion proof path.
 * Each step is a sibling hash and its position relative to the proof node.
 */
export interface MerkleProofStep {
  readonly hash: string;
  readonly direction: SiblingDirection;
}

/**
 * A Merkle inclusion proof — proves that a specific leaf exists
 * in a Merkle tree with a given root.
 *
 * Self-contained: a verifier needs ONLY this proof to check inclusion.
 */
export interface MerkleProof {
  /** SHA-256 hash of the leaf being proven */
  readonly leafHash: string;
  /** Index of the leaf in the original tree (0-based) */
  readonly leafIndex: number;
  /** Path from leaf to root — sibling hashes at each level */
  readonly siblings: readonly MerkleProofStep[];
  /** Merkle root hash (expected) */
  readonly root: string;
}

/**
 * Internal node in a Merkle tree.
 * Leaf nodes have no children; internal nodes have exactly two.
 */
export interface MerkleNode {
  readonly hash: string;
  readonly left?: MerkleNode | undefined;
  readonly right?: MerkleNode | undefined;
}

// =============================================================================
// Attestation Proof Types
// =============================================================================

/**
 * A self-contained attestation proof package.
 *
 * Contains everything needed to verify that a specific attestation
 * was included in the system's event set — without access to the
 * full event store.
 *
 * Verification requires ONLY this package (no external dependencies).
 */
export interface AttestationProofPackage {
  /** Version of the proof package format */
  readonly version: 1;
  /** The attestation data being proven */
  readonly attestation: unknown;
  /** SHA-256 hash of the canonical attestation data */
  readonly attestationHash: string;
  /** Merkle root of the full event hash set */
  readonly merkleRoot: string;
  /** Inclusion proof: proves attestationHash is in the Merkle tree */
  readonly inclusionProof: MerkleProof;
  /** When this proof package was created */
  readonly packagedAt: string;
  /** SHA-256 of canonical(entire package minus this field) for tamper evidence */
  readonly packageHash: string;
}
