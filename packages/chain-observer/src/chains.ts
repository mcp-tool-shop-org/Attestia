/**
 * Chain Definitions
 *
 * Known chains and helper functions for chain identification.
 * Uses CAIP-2 convention for chain IDs where applicable.
 */

import type { ChainRef, ChainId } from "@attestia/types";

// =============================================================================
// Well-Known Chains
// =============================================================================

export const CHAINS = {
  // EVM chains
  ETHEREUM_MAINNET: {
    chainId: "eip155:1",
    name: "Ethereum Mainnet",
    family: "evm",
  },
  ETHEREUM_SEPOLIA: {
    chainId: "eip155:11155111",
    name: "Ethereum Sepolia",
    family: "evm",
  },
  BASE_MAINNET: {
    chainId: "eip155:8453",
    name: "Base Mainnet",
    family: "evm",
  },
  ARBITRUM_ONE: {
    chainId: "eip155:42161",
    name: "Arbitrum One",
    family: "evm",
  },
  OPTIMISM: {
    chainId: "eip155:10",
    name: "OP Mainnet",
    family: "evm",
  },
  POLYGON: {
    chainId: "eip155:137",
    name: "Polygon PoS",
    family: "evm",
  },

  // XRPL chains
  XRPL_MAINNET: {
    chainId: "xrpl:main",
    name: "XRP Ledger Mainnet",
    family: "xrpl",
  },
  XRPL_TESTNET: {
    chainId: "xrpl:testnet",
    name: "XRP Ledger Testnet",
    family: "xrpl",
  },

  // Solana chains
  SOLANA_MAINNET: {
    chainId: "solana:mainnet-beta",
    name: "Solana Mainnet",
    family: "solana",
  },
  SOLANA_DEVNET: {
    chainId: "solana:devnet",
    name: "Solana Devnet",
    family: "solana",
  },
} as const satisfies Record<string, ChainRef>;

// =============================================================================
// Helpers
// =============================================================================

const chainMap = new Map<ChainId, ChainRef>(
  Object.values(CHAINS).map((c) => [c.chainId, c])
);

/**
 * Look up a ChainRef by its chainId.
 * Returns undefined if the chain is not known.
 */
export function getChainRef(chainId: ChainId): ChainRef | undefined {
  return chainMap.get(chainId);
}

/**
 * Check if a chainId belongs to an EVM-compatible chain.
 */
export function isEvmChain(chainId: ChainId): boolean {
  return chainId.startsWith("eip155:");
}

/**
 * Check if a chainId belongs to the XRP Ledger.
 */
export function isXrplChain(chainId: ChainId): boolean {
  return chainId.startsWith("xrpl:");
}

/**
 * Check if a chainId belongs to the Solana network.
 */
export function isSolanaChain(chainId: ChainId): boolean {
  return chainId.startsWith("solana:");
}
