/**
 * Solana RPC Configuration
 *
 * Configuration types for Solana RPC connections.
 * Commitment level controls data freshness vs. safety trade-off.
 *
 * Rules:
 * - No silent commitment downgrade — if a commitment level is requested,
 *   failure is preferred over silently using a weaker commitment.
 * - All types are immutable (readonly).
 */

import type { SolanaCommitment } from "@attestia/types";

// =============================================================================
// RPC Configuration
// =============================================================================

/**
 * Configuration for Solana RPC connections.
 */
export interface SolanaRpcConfig {
  /**
   * Default commitment level for queries.
   *
   * - "processed": Fastest, least safe. Transaction processed by leader.
   * - "confirmed": Default. Confirmed by supermajority of stake.
   * - "finalized": Slowest, safest. Transaction cannot be rolled back.
   */
  readonly commitment: SolanaCommitment;

  /**
   * Request timeout in milliseconds.
   * Default: 30000 (30 seconds).
   */
  readonly timeoutMs: number;

  /**
   * Maximum number of retries for transient RPC errors.
   * Default: 3.
   */
  readonly maxRetries: number;

  /**
   * Delay between retries in milliseconds.
   * Default: 1000 (1 second).
   */
  readonly retryDelayMs: number;
}

/**
 * Default Solana RPC configuration.
 */
export const DEFAULT_SOLANA_RPC_CONFIG: SolanaRpcConfig = {
  commitment: "confirmed",
  timeoutMs: 30_000,
  maxRetries: 3,
  retryDelayMs: 1_000,
};
