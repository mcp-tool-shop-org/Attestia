/**
 * @attestia/proof — Merkle Tree.
 *
 * Binary hash tree for inclusion proofs over event sets.
 *
 * Design:
 * - All hashing uses SHA-256 (caller provides pre-hashed leaves)
 * - Internal nodes: SHA-256(left || right) — concatenation of hex strings
 * - Odd leaf count: duplicate the last leaf to make even
 * - Empty tree: null root
 * - Single leaf: leaf IS the root (no internal nodes)
 * - Deterministic: same leaves → same root
 * - Immutable: build once, query many times
 */

import { createHash } from "node:crypto";
import type { MerkleNode, MerkleProof, MerkleProofStep } from "./types.js";

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Hash two child hashes to produce a parent hash.
 * Uses SHA-256(leftHex + rightHex) — concatenation of hex strings.
 */
function hashPair(left: string, right: string): string {
  return createHash("sha256").update(left + right).digest("hex");
}

/**
 * Build a Merkle tree from a layer of nodes (bottom-up).
 * Returns the root node.
 */
function buildTree(leaves: readonly string[]): MerkleNode | null {
  if (leaves.length === 0) {
    return null;
  }

  // Create leaf nodes
  let currentLevel: MerkleNode[] = leaves.map((hash) => ({ hash }));

  // Build tree bottom-up
  while (currentLevel.length > 1) {
    const nextLevel: MerkleNode[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;

      // If odd number of nodes, duplicate the last one
      const right =
        i + 1 < currentLevel.length ? currentLevel[i + 1]! : left;

      const parentHash = hashPair(left.hash, right.hash);
      nextLevel.push({
        hash: parentHash,
        left,
        right,
      });
    }

    currentLevel = nextLevel;
  }

  return currentLevel[0] ?? null;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Immutable Merkle tree built from pre-hashed leaves.
 *
 * Usage:
 * ```ts
 * const tree = MerkleTree.build(["aabb...", "ccdd...", ...]);
 * const root = tree.getRoot();          // root hash or null
 * const proof = tree.getProof(0);       // inclusion proof for leaf 0
 * MerkleTree.verifyProof(proof);        // true/false
 * ```
 */
export class MerkleTree {
  private readonly root: MerkleNode | null;
  private readonly leaves: readonly string[];

  private constructor(leaves: readonly string[]) {
    this.leaves = leaves;
    this.root = buildTree(leaves);
  }

  /**
   * Build a Merkle tree from pre-hashed leaf values.
   *
   * Leaves must be SHA-256 hex strings (64 chars). The caller is
   * responsible for hashing their data before passing it here.
   *
   * @param leaves - Array of SHA-256 hex strings
   * @returns Immutable MerkleTree instance
   */
  static build(leaves: readonly string[]): MerkleTree {
    return new MerkleTree(leaves);
  }

  /**
   * Get the root hash of the tree.
   * Returns null for an empty tree.
   */
  getRoot(): string | null {
    return this.root?.hash ?? null;
  }

  /**
   * Get the number of leaves in the tree.
   */
  getLeafCount(): number {
    return this.leaves.length;
  }

  /**
   * Generate an inclusion proof for the leaf at the given index.
   *
   * The returned proof is self-contained: it includes the leaf hash,
   * all sibling hashes along the path to the root, and the root itself.
   *
   * @param leafIndex - 0-based index of the leaf
   * @returns MerkleProof or null if index is out of range or tree is empty
   */
  getProof(leafIndex: number): MerkleProof | null {
    if (
      this.root === null ||
      leafIndex < 0 ||
      leafIndex >= this.leaves.length
    ) {
      return null;
    }

    const leafHash = this.leaves[leafIndex]!;

    // Single leaf — no siblings needed
    if (this.leaves.length === 1) {
      return {
        leafHash,
        leafIndex,
        siblings: [],
        root: this.root.hash,
      };
    }

    // Walk the tree bottom-up, collecting siblings
    const siblings: MerkleProofStep[] = [];
    let currentIndex = leafIndex;

    // Reconstruct levels to find siblings at each level
    let currentLevel = [...this.leaves];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]!;
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1]! : left;
        nextLevel.push(hashPair(left, right));
      }

      // Determine sibling for currentIndex
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      // Handle odd count: if we're the last element with no sibling, use self
      const sibling =
        siblingIndex < currentLevel.length
          ? currentLevel[siblingIndex]!
          : currentLevel[currentIndex]!;

      siblings.push({
        hash: sibling,
        direction: isLeft ? "right" : "left",
      });

      // Move to parent index
      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    return {
      leafHash,
      leafIndex,
      siblings,
      root: this.root.hash,
    };
  }

  /**
   * Verify a Merkle inclusion proof.
   *
   * Statically verifiable — does not need the original tree.
   * Checks that traversing from the leaf through the sibling path
   * produces the expected root hash.
   *
   * @param proof - The inclusion proof to verify
   * @returns true if the proof is valid
   */
  static verifyProof(proof: MerkleProof): boolean {
    let currentHash = proof.leafHash;

    for (const step of proof.siblings) {
      if (step.direction === "left") {
        // Sibling is on the left
        currentHash = hashPair(step.hash, currentHash);
      } else {
        // Sibling is on the right
        currentHash = hashPair(currentHash, step.hash);
      }
    }

    return currentHash === proof.root;
  }
}
