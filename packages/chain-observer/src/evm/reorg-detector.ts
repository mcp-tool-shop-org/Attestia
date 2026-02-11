/**
 * Reorg Detector — Detects chain reorganizations on EVM L2 chains.
 *
 * Maintains a rolling buffer of recent block hashes and detects when
 * a block hash at a previously seen block number has changed.
 *
 * Design:
 * - Fail-closed: ambiguous state is treated as a reorg
 * - No partial events after reorg detection
 * - Buffer is bounded (configurable depth)
 * - Deterministic: same input sequence → same detection results
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Block reference used for reorg detection.
 */
export interface BlockRecord {
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly timestamp: string;
}

/**
 * Payload emitted when a reorg is detected.
 */
export interface L2ReorgDetectedPayload {
  readonly chainId: string;
  readonly blockNumber: number;
  readonly expectedHash: string;
  readonly actualHash: string;
  readonly detectedAt: string;
  readonly bufferDepth: number;
}

// =============================================================================
// Reorg Detector
// =============================================================================

export class ReorgDetector {
  readonly chainId: string;
  private readonly maxDepth: number;
  private readonly blockBuffer: Map<number, string>;

  /**
   * @param chainId The CAIP-2 chain ID this detector monitors
   * @param maxDepth Maximum number of block records to retain (default: 128)
   */
  constructor(chainId: string, maxDepth = 128) {
    this.chainId = chainId;
    this.maxDepth = maxDepth;
    this.blockBuffer = new Map();
  }

  /**
   * Check a block against the buffer.
   *
   * If the block number has been seen before with a different hash,
   * a reorg payload is returned. Otherwise the block is recorded
   * and undefined is returned.
   *
   * @returns Reorg payload if reorg detected, undefined otherwise
   */
  checkBlock(block: BlockRecord): L2ReorgDetectedPayload | undefined {
    const existing = this.blockBuffer.get(block.blockNumber);

    if (existing !== undefined && existing !== block.blockHash) {
      // Hash mismatch at same block number → reorg
      return {
        chainId: this.chainId,
        blockNumber: block.blockNumber,
        expectedHash: existing,
        actualHash: block.blockHash,
        detectedAt: new Date().toISOString(),
        bufferDepth: this.blockBuffer.size,
      };
    }

    // Record the block
    this.blockBuffer.set(block.blockNumber, block.blockHash);

    // Prune old entries if buffer exceeds max depth
    if (this.blockBuffer.size > this.maxDepth) {
      const oldestKey = this.blockBuffer.keys().next().value;
      if (oldestKey !== undefined) {
        this.blockBuffer.delete(oldestKey);
      }
    }

    return undefined;
  }

  /**
   * Clear the buffer. Use after handling a reorg to start fresh.
   */
  reset(): void {
    this.blockBuffer.clear();
  }

  /**
   * Current number of blocks in the buffer.
   */
  get size(): number {
    return this.blockBuffer.size;
  }

  /**
   * Check if a specific block number exists in the buffer.
   */
  has(blockNumber: number): boolean {
    return this.blockBuffer.has(blockNumber);
  }
}

// =============================================================================
// Cross-Chain Collision Prevention
// =============================================================================

/**
 * Produce a canonical hash key for a transaction that is unique across chains.
 *
 * Problem: The same txHash can theoretically exist on two different EVM chains.
 * Solution: Prefix the txHash with the chain ID to create a globally unique key.
 *
 * @param chainId CAIP-2 chain ID (e.g., "eip155:1")
 * @param txHash Transaction hash
 * @returns Canonical key: "chainId:txHash"
 */
export function canonicalTxKey(chainId: string, txHash: string): string {
  return `${chainId}:${txHash}`;
}
