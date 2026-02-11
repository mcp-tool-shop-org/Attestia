/**
 * Predefined Chain Profiles
 *
 * Ready-to-use profiles for well-known chains.
 * Each profile combines chain identity, finality parameters,
 * and native token metadata.
 *
 * These profiles encode the finality model of each chain:
 * - Ethereum L1: PoS with 12-block safe threshold, 64-block finality
 * - L2 (Arbitrum, Optimism, Base): Sequencer-confirmed with L1 settlement
 * - Solana: Commitment levels (processed → confirmed → finalized)
 * - XRPL: Validated ledger (near-instant finality)
 */

import { CHAINS } from "./chains.js";
import type { ChainProfile } from "./finality.js";

// =============================================================================
// Ethereum L1
// =============================================================================

export const ETHEREUM_PROFILE: ChainProfile = {
  chain: CHAINS.ETHEREUM_MAINNET,
  finality: {
    confirmations: 12,
    safeBlockTag: "safe",
    finalizedBlockTag: "finalized",
    reorgDepth: 64,
  },
  nativeToken: {
    symbol: "ETH",
    decimals: 18,
  },
};

export const ETHEREUM_SEPOLIA_PROFILE: ChainProfile = {
  chain: CHAINS.ETHEREUM_SEPOLIA,
  finality: {
    confirmations: 12,
    safeBlockTag: "safe",
    finalizedBlockTag: "finalized",
    reorgDepth: 64,
  },
  nativeToken: {
    symbol: "ETH",
    decimals: 18,
  },
};

// =============================================================================
// L2 Chains — All settle on Ethereum L1
// =============================================================================

export const ARBITRUM_PROFILE: ChainProfile = {
  chain: CHAINS.ARBITRUM_ONE,
  finality: {
    confirmations: 0, // Sequencer-confirmed
    safeBlockTag: "safe",
    finalizedBlockTag: "finalized",
    reorgDepth: 0, // Sequencer provides ordering; no reorgs under normal conditions
  },
  isL2: true,
  settlementChainId: "eip155:1",
  nativeToken: {
    symbol: "ETH",
    decimals: 18,
  },
};

export const OPTIMISM_PROFILE: ChainProfile = {
  chain: CHAINS.OPTIMISM,
  finality: {
    confirmations: 0, // Sequencer-confirmed
    safeBlockTag: "safe",
    finalizedBlockTag: "finalized",
    reorgDepth: 0, // Sequencer provides ordering
  },
  isL2: true,
  settlementChainId: "eip155:1",
  nativeToken: {
    symbol: "ETH",
    decimals: 18,
  },
};

export const BASE_PROFILE: ChainProfile = {
  chain: CHAINS.BASE_MAINNET,
  finality: {
    confirmations: 0, // Sequencer-confirmed
    safeBlockTag: "safe",
    finalizedBlockTag: "finalized",
    reorgDepth: 0, // Sequencer provides ordering
  },
  isL2: true,
  settlementChainId: "eip155:1",
  nativeToken: {
    symbol: "ETH",
    decimals: 18,
  },
};

export const POLYGON_PROFILE: ChainProfile = {
  chain: CHAINS.POLYGON,
  finality: {
    confirmations: 128, // PoS with checkpointing to Ethereum
    safeBlockTag: "safe",
    finalizedBlockTag: "finalized",
    reorgDepth: 128,
  },
  nativeToken: {
    symbol: "POL",
    decimals: 18,
  },
};

// =============================================================================
// Solana
// =============================================================================

export const SOLANA_MAINNET_PROFILE: ChainProfile = {
  chain: CHAINS.SOLANA_MAINNET,
  finality: {
    confirmations: 0, // Solana uses commitment levels, not confirmation counts
    reorgDepth: 0, // No reorgs at "finalized" commitment
    commitmentLevel: "confirmed", // Default: supermajority confirmation
  },
  nativeToken: {
    symbol: "SOL",
    decimals: 9,
  },
};

export const SOLANA_DEVNET_PROFILE: ChainProfile = {
  chain: CHAINS.SOLANA_DEVNET,
  finality: {
    confirmations: 0,
    reorgDepth: 0,
    commitmentLevel: "confirmed",
  },
  nativeToken: {
    symbol: "SOL",
    decimals: 9,
  },
};

// =============================================================================
// XRPL
// =============================================================================

export const XRPL_MAINNET_PROFILE: ChainProfile = {
  chain: CHAINS.XRPL_MAINNET,
  finality: {
    confirmations: 0, // XRPL: validated ledger = final
    reorgDepth: 0, // No reorgs on XRPL
  },
  nativeToken: {
    symbol: "XRP",
    decimals: 6,
  },
};

export const XRPL_TESTNET_PROFILE: ChainProfile = {
  chain: CHAINS.XRPL_TESTNET,
  finality: {
    confirmations: 0,
    reorgDepth: 0,
  },
  nativeToken: {
    symbol: "XRP",
    decimals: 6,
  },
};

// =============================================================================
// Profile Lookup
// =============================================================================

/** All predefined profiles, keyed by chain ID. */
export const CHAIN_PROFILES: ReadonlyMap<string, ChainProfile> = new Map([
  [CHAINS.ETHEREUM_MAINNET.chainId, ETHEREUM_PROFILE],
  [CHAINS.ETHEREUM_SEPOLIA.chainId, ETHEREUM_SEPOLIA_PROFILE],
  [CHAINS.ARBITRUM_ONE.chainId, ARBITRUM_PROFILE],
  [CHAINS.OPTIMISM.chainId, OPTIMISM_PROFILE],
  [CHAINS.BASE_MAINNET.chainId, BASE_PROFILE],
  [CHAINS.POLYGON.chainId, POLYGON_PROFILE],
  [CHAINS.SOLANA_MAINNET.chainId, SOLANA_MAINNET_PROFILE],
  [CHAINS.SOLANA_DEVNET.chainId, SOLANA_DEVNET_PROFILE],
  [CHAINS.XRPL_MAINNET.chainId, XRPL_MAINNET_PROFILE],
  [CHAINS.XRPL_TESTNET.chainId, XRPL_TESTNET_PROFILE],
]);

/**
 * Look up a predefined profile by chain ID.
 * Returns undefined if no profile exists for the given chain.
 */
export function getChainProfile(chainId: string): ChainProfile | undefined {
  return CHAIN_PROFILES.get(chainId);
}
