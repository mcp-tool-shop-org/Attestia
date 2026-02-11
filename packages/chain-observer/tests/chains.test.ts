/**
 * Tests for chain definitions and helpers.
 */

import { describe, it, expect } from "vitest";
import {
  CHAINS,
  getChainRef,
  isEvmChain,
  isXrplChain,
  isSolanaChain,
} from "../src/chains.js";

describe("CHAINS", () => {
  it("contains Ethereum Mainnet", () => {
    expect(CHAINS.ETHEREUM_MAINNET.chainId).toBe("eip155:1");
    expect(CHAINS.ETHEREUM_MAINNET.family).toBe("evm");
  });

  it("contains XRPL Mainnet", () => {
    expect(CHAINS.XRPL_MAINNET.chainId).toBe("xrpl:main");
    expect(CHAINS.XRPL_MAINNET.family).toBe("xrpl");
  });

  it("contains Solana Mainnet", () => {
    expect(CHAINS.SOLANA_MAINNET.chainId).toBe("solana:mainnet-beta");
    expect(CHAINS.SOLANA_MAINNET.family).toBe("solana");
    expect(CHAINS.SOLANA_MAINNET.name).toBe("Solana Mainnet");
  });

  it("contains Solana Devnet", () => {
    expect(CHAINS.SOLANA_DEVNET.chainId).toBe("solana:devnet");
    expect(CHAINS.SOLANA_DEVNET.family).toBe("solana");
  });

  it("contains all expected chains", () => {
    const keys = Object.keys(CHAINS);
    expect(keys).toContain("ETHEREUM_MAINNET");
    expect(keys).toContain("ETHEREUM_SEPOLIA");
    expect(keys).toContain("BASE_MAINNET");
    expect(keys).toContain("ARBITRUM_ONE");
    expect(keys).toContain("OPTIMISM");
    expect(keys).toContain("POLYGON");
    expect(keys).toContain("XRPL_MAINNET");
    expect(keys).toContain("XRPL_TESTNET");
    expect(keys).toContain("SOLANA_MAINNET");
    expect(keys).toContain("SOLANA_DEVNET");
    expect(keys).toContain("XRPL_EVM_DEVNET");
    expect(keys.length).toBe(11);
  });

  it("all EVM chains use eip155: prefix", () => {
    const evmChains = Object.values(CHAINS).filter((c) => c.family === "evm");
    for (const chain of evmChains) {
      expect(chain.chainId).toMatch(/^eip155:\d+$/);
    }
  });

  it("all XRPL chains use xrpl: prefix", () => {
    const xrplChains = Object.values(CHAINS).filter(
      (c) => c.family === "xrpl"
    );
    for (const chain of xrplChains) {
      expect(chain.chainId).toMatch(/^xrpl:/);
    }
  });

  it("all Solana chains use solana: prefix", () => {
    const solanaChains = Object.values(CHAINS).filter(
      (c) => c.family === "solana"
    );
    expect(solanaChains.length).toBeGreaterThan(0);
    for (const chain of solanaChains) {
      expect(chain.chainId).toMatch(/^solana:/);
    }
  });
});

describe("getChainRef", () => {
  it("returns ChainRef for known chain ID", () => {
    const ref = getChainRef("eip155:1");
    expect(ref).toBeDefined();
    expect(ref!.name).toBe("Ethereum Mainnet");
    expect(ref!.family).toBe("evm");
  });

  it("returns ChainRef for XRPL", () => {
    const ref = getChainRef("xrpl:main");
    expect(ref).toBeDefined();
    expect(ref!.name).toBe("XRP Ledger Mainnet");
  });

  it("returns ChainRef for Solana", () => {
    const ref = getChainRef("solana:mainnet-beta");
    expect(ref).toBeDefined();
    expect(ref!.name).toBe("Solana Mainnet");
    expect(ref!.family).toBe("solana");
  });

  it("returns undefined for unknown chain ID", () => {
    expect(getChainRef("eip155:999999")).toBeUndefined();
    expect(getChainRef("unknown:chain")).toBeUndefined();
  });
});

describe("isEvmChain", () => {
  it("returns true for EVM chain IDs", () => {
    expect(isEvmChain("eip155:1")).toBe(true);
    expect(isEvmChain("eip155:8453")).toBe(true);
    expect(isEvmChain("eip155:42161")).toBe(true);
  });

  it("returns false for non-EVM chain IDs", () => {
    expect(isEvmChain("xrpl:main")).toBe(false);
    expect(isEvmChain("solana:main")).toBe(false);
  });
});

describe("isXrplChain", () => {
  it("returns true for XRPL chain IDs", () => {
    expect(isXrplChain("xrpl:main")).toBe(true);
    expect(isXrplChain("xrpl:testnet")).toBe(true);
  });

  it("returns false for non-XRPL chain IDs", () => {
    expect(isXrplChain("eip155:1")).toBe(false);
    expect(isXrplChain("solana:main")).toBe(false);
  });
});

describe("isSolanaChain", () => {
  it("returns true for Solana chain IDs", () => {
    expect(isSolanaChain("solana:mainnet-beta")).toBe(true);
    expect(isSolanaChain("solana:devnet")).toBe(true);
    expect(isSolanaChain("solana:testnet")).toBe(true);
  });

  it("returns false for non-Solana chain IDs", () => {
    expect(isSolanaChain("eip155:1")).toBe(false);
    expect(isSolanaChain("xrpl:main")).toBe(false);
  });
});
