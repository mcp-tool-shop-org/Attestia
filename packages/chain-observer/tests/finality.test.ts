/**
 * Tests for finality types and chain profiles.
 */

import { describe, it, expect } from "vitest";
import {
  ETHEREUM_PROFILE,
  ETHEREUM_SEPOLIA_PROFILE,
  ARBITRUM_PROFILE,
  OPTIMISM_PROFILE,
  BASE_PROFILE,
  POLYGON_PROFILE,
  SOLANA_MAINNET_PROFILE,
  SOLANA_DEVNET_PROFILE,
  XRPL_MAINNET_PROFILE,
  XRPL_TESTNET_PROFILE,
  CHAIN_PROFILES,
  getChainProfile,
} from "../src/profiles.js";
import { CHAINS } from "../src/chains.js";

// =============================================================================
// Profile structure
// =============================================================================

describe("ChainProfiles — structure", () => {
  const allProfiles = [
    ETHEREUM_PROFILE,
    ETHEREUM_SEPOLIA_PROFILE,
    ARBITRUM_PROFILE,
    OPTIMISM_PROFILE,
    BASE_PROFILE,
    POLYGON_PROFILE,
    SOLANA_MAINNET_PROFILE,
    SOLANA_DEVNET_PROFILE,
    XRPL_MAINNET_PROFILE,
    XRPL_TESTNET_PROFILE,
  ];

  it("all profiles have required finality fields", () => {
    for (const profile of allProfiles) {
      expect(typeof profile.finality.confirmations).toBe("number");
      expect(typeof profile.finality.reorgDepth).toBe("number");
      expect(profile.finality.confirmations).toBeGreaterThanOrEqual(0);
      expect(profile.finality.reorgDepth).toBeGreaterThanOrEqual(0);
    }
  });

  it("all profiles have a chain reference", () => {
    for (const profile of allProfiles) {
      expect(typeof profile.chain.chainId).toBe("string");
      expect(typeof profile.chain.name).toBe("string");
      expect(typeof profile.chain.family).toBe("string");
    }
  });
});

// =============================================================================
// Ethereum L1
// =============================================================================

describe("ETHEREUM_PROFILE", () => {
  it("has correct chain identity", () => {
    expect(ETHEREUM_PROFILE.chain.chainId).toBe("eip155:1");
    expect(ETHEREUM_PROFILE.chain.family).toBe("evm");
  });

  it("has L1 finality parameters", () => {
    expect(ETHEREUM_PROFILE.finality.confirmations).toBe(12);
    expect(ETHEREUM_PROFILE.finality.reorgDepth).toBe(64);
    expect(ETHEREUM_PROFILE.finality.safeBlockTag).toBe("safe");
    expect(ETHEREUM_PROFILE.finality.finalizedBlockTag).toBe("finalized");
  });

  it("has native token metadata", () => {
    expect(ETHEREUM_PROFILE.nativeToken?.symbol).toBe("ETH");
    expect(ETHEREUM_PROFILE.nativeToken?.decimals).toBe(18);
  });

  it("is not an L2", () => {
    expect(ETHEREUM_PROFILE.isL2).toBeUndefined();
    expect(ETHEREUM_PROFILE.settlementChainId).toBeUndefined();
  });
});

// =============================================================================
// L2 Chains
// =============================================================================

describe("L2 Profiles", () => {
  const l2Profiles = [ARBITRUM_PROFILE, OPTIMISM_PROFILE, BASE_PROFILE];

  it("all L2 profiles are marked as L2", () => {
    for (const profile of l2Profiles) {
      expect(profile.isL2).toBe(true);
    }
  });

  it("all L2 profiles settle on Ethereum L1", () => {
    for (const profile of l2Profiles) {
      expect(profile.settlementChainId).toBe("eip155:1");
    }
  });

  it("all L2 profiles have zero confirmation (sequencer-confirmed)", () => {
    for (const profile of l2Profiles) {
      expect(profile.finality.confirmations).toBe(0);
    }
  });

  it("all L2 profiles have zero reorg depth (sequencer provides ordering)", () => {
    for (const profile of l2Profiles) {
      expect(profile.finality.reorgDepth).toBe(0);
    }
  });

  it("all L2 profiles have ETH native token", () => {
    for (const profile of l2Profiles) {
      expect(profile.nativeToken?.symbol).toBe("ETH");
      expect(profile.nativeToken?.decimals).toBe(18);
    }
  });
});

describe("POLYGON_PROFILE", () => {
  it("has POL native token", () => {
    expect(POLYGON_PROFILE.nativeToken?.symbol).toBe("POL");
    expect(POLYGON_PROFILE.nativeToken?.decimals).toBe(18);
  });

  it("has non-zero reorg depth", () => {
    expect(POLYGON_PROFILE.finality.reorgDepth).toBeGreaterThan(0);
  });
});

// =============================================================================
// Solana
// =============================================================================

describe("SOLANA_MAINNET_PROFILE", () => {
  it("has correct chain identity", () => {
    expect(SOLANA_MAINNET_PROFILE.chain.chainId).toBe("solana:mainnet-beta");
    expect(SOLANA_MAINNET_PROFILE.chain.family).toBe("solana");
  });

  it("has commitment level instead of confirmation count", () => {
    expect(SOLANA_MAINNET_PROFILE.finality.commitmentLevel).toBe("confirmed");
    expect(SOLANA_MAINNET_PROFILE.finality.confirmations).toBe(0);
  });

  it("has no reorgs at finalized commitment", () => {
    expect(SOLANA_MAINNET_PROFILE.finality.reorgDepth).toBe(0);
  });

  it("has SOL native token (9 decimals)", () => {
    expect(SOLANA_MAINNET_PROFILE.nativeToken?.symbol).toBe("SOL");
    expect(SOLANA_MAINNET_PROFILE.nativeToken?.decimals).toBe(9);
  });
});

// =============================================================================
// XRPL
// =============================================================================

describe("XRPL_MAINNET_PROFILE", () => {
  it("has correct chain identity", () => {
    expect(XRPL_MAINNET_PROFILE.chain.chainId).toBe("xrpl:main");
    expect(XRPL_MAINNET_PROFILE.chain.family).toBe("xrpl");
  });

  it("has zero confirmations (validated = final)", () => {
    expect(XRPL_MAINNET_PROFILE.finality.confirmations).toBe(0);
  });

  it("has zero reorg depth", () => {
    expect(XRPL_MAINNET_PROFILE.finality.reorgDepth).toBe(0);
  });

  it("has XRP native token (6 decimals)", () => {
    expect(XRPL_MAINNET_PROFILE.nativeToken?.symbol).toBe("XRP");
    expect(XRPL_MAINNET_PROFILE.nativeToken?.decimals).toBe(6);
  });
});

// =============================================================================
// Profile lookup
// =============================================================================

describe("CHAIN_PROFILES map", () => {
  it("contains all 10 predefined profiles", () => {
    expect(CHAIN_PROFILES.size).toBe(10);
  });

  it("maps from chainId to profile", () => {
    const profile = CHAIN_PROFILES.get("eip155:1");
    expect(profile).toBe(ETHEREUM_PROFILE);
  });

  it("maps Solana mainnet", () => {
    const profile = CHAIN_PROFILES.get("solana:mainnet-beta");
    expect(profile).toBe(SOLANA_MAINNET_PROFILE);
  });
});

describe("getChainProfile", () => {
  it("returns profile for known chain", () => {
    expect(getChainProfile("eip155:1")).toBe(ETHEREUM_PROFILE);
    expect(getChainProfile("solana:mainnet-beta")).toBe(SOLANA_MAINNET_PROFILE);
    expect(getChainProfile("xrpl:main")).toBe(XRPL_MAINNET_PROFILE);
  });

  it("returns undefined for unknown chain", () => {
    expect(getChainProfile("eip155:999999")).toBeUndefined();
    expect(getChainProfile("unknown:chain")).toBeUndefined();
  });
});
