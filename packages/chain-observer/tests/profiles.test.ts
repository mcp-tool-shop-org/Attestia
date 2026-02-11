/**
 * Tests for L2 chain profile properties.
 *
 * Verifies that L2 profiles have correct settlement chain IDs,
 * reorg depth, sequencer behavior, and native token metadata.
 */

import { describe, it, expect } from "vitest";
import {
  ARBITRUM_PROFILE,
  OPTIMISM_PROFILE,
  BASE_PROFILE,
  POLYGON_PROFILE,
  ETHEREUM_PROFILE,
  SOLANA_MAINNET_PROFILE,
  CHAIN_PROFILES,
} from "../src/profiles.js";

describe("L2 chain profiles", () => {
  const L2_PROFILES = [ARBITRUM_PROFILE, OPTIMISM_PROFILE, BASE_PROFILE];

  it("all L2 profiles have isL2 = true", () => {
    for (const profile of L2_PROFILES) {
      expect(profile.isL2).toBe(true);
    }
  });

  it("all L2 profiles settle on Ethereum L1", () => {
    for (const profile of L2_PROFILES) {
      expect(profile.settlementChainId).toBe("eip155:1");
    }
  });

  it("all L2 sequencers have zero confirmations", () => {
    for (const profile of L2_PROFILES) {
      expect(profile.finality.confirmations).toBe(0);
    }
  });

  it("all L2 sequencers have zero reorg depth (under normal conditions)", () => {
    for (const profile of L2_PROFILES) {
      expect(profile.finality.reorgDepth).toBe(0);
    }
  });

  it("Ethereum L1 is not an L2", () => {
    expect(ETHEREUM_PROFILE.isL2).toBeUndefined();
    expect(ETHEREUM_PROFILE.settlementChainId).toBeUndefined();
  });

  it("Ethereum L1 has non-zero reorg depth", () => {
    expect(ETHEREUM_PROFILE.finality.reorgDepth).toBe(64);
  });

  it("Polygon has non-zero confirmations and reorg depth", () => {
    expect(POLYGON_PROFILE.finality.confirmations).toBe(128);
    expect(POLYGON_PROFILE.finality.reorgDepth).toBe(128);
  });

  it("Polygon is not marked as L2 (independent chain)", () => {
    // Polygon is technically a sidechain, not an L2
    expect(POLYGON_PROFILE.isL2).toBeUndefined();
  });

  it("Solana is not an L2", () => {
    expect(SOLANA_MAINNET_PROFILE.isL2).toBeUndefined();
    expect(SOLANA_MAINNET_PROFILE.settlementChainId).toBeUndefined();
  });

  it("all L2 profiles have safe and finalized block tags", () => {
    for (const profile of L2_PROFILES) {
      expect(profile.finality.safeBlockTag).toBe("safe");
      expect(profile.finality.finalizedBlockTag).toBe("finalized");
    }
  });

  it("all L2 profiles have native token metadata", () => {
    for (const profile of L2_PROFILES) {
      expect(profile.nativeToken).toBeDefined();
      expect(profile.nativeToken!.symbol).toBe("ETH");
      expect(profile.nativeToken!.decimals).toBe(18);
    }
  });

  it("CHAIN_PROFILES map contains all 10 profiles", () => {
    expect(CHAIN_PROFILES.size).toBe(10);
  });
});
