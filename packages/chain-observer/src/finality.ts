/**
 * Finality Configuration
 *
 * Shared abstraction for chain-specific finality models.
 * Both Solana (commitment levels) and EVM L2s (sequencer finality)
 * need configurable confirmation parameters.
 *
 * Design rules:
 * - All types are immutable (readonly)
 * - No runtime behavior — configuration only
 * - No chain-specific logic in these types
 */

import type { ChainRef, ChainId } from "@attestia/types";

// =============================================================================
// Finality Configuration
// =============================================================================

/**
 * Finality parameters for a chain.
 *
 * Different chains have different finality models:
 * - Ethereum L1: 12-64 block confirmations, "safe" and "finalized" tags
 * - L2 (Arbitrum, Optimism, Base): Sequencer-confirmed (~0 blocks), then L1 settlement
 * - Solana: processed → confirmed → finalized commitment levels
 * - XRPL: Validated ledger (near-instant finality)
 */
export interface FinalityConfig {
  /**
   * Number of block confirmations before considering a transaction safe.
   * For L2 sequencers this is typically 0 (sequencer-confirmed).
   * For Ethereum L1 this is typically 12 (safe) or 64 (finalized).
   */
  readonly confirmations: number;

  /**
   * Block tag for "safe" queries (EVM-specific).
   * e.g. "safe" for Ethereum, "latest" for L2 sequencers.
   */
  readonly safeBlockTag?: string;

  /**
   * Block tag for "finalized" queries (EVM-specific).
   * e.g. "finalized" for Ethereum.
   */
  readonly finalizedBlockTag?: string;

  /**
   * Maximum reorg depth to protect against.
   * 0 for chains with no reorgs (L2 sequencers, XRPL).
   * 64 for Ethereum L1 (Casper finality boundary).
   */
  readonly reorgDepth: number;

  /**
   * Solana commitment level for queries.
   * Only applicable to Solana family chains.
   */
  readonly commitmentLevel?: "processed" | "confirmed" | "finalized";
}

// =============================================================================
// Chain Profile
// =============================================================================

/**
 * A complete chain profile combining identity and finality configuration.
 *
 * Profiles are used by observers to apply chain-appropriate behavior
 * without hardcoding chain-specific logic into the observer itself.
 */
export interface ChainProfile {
  /** Chain reference (identity) */
  readonly chain: ChainRef;

  /** Finality configuration for this chain */
  readonly finality: FinalityConfig;

  /** Whether this is an L2 chain (settles on another chain) */
  readonly isL2?: boolean;

  /** If L2, the chain ID of the settlement (L1) chain */
  readonly settlementChainId?: ChainId;

  /** Native token metadata */
  readonly nativeToken?: {
    readonly symbol: string;
    readonly decimals: number;
  };
}
