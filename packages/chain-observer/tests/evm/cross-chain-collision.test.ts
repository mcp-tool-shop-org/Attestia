/**
 * Tests for cross-chain collision prevention.
 *
 * Verifies that the same txHash on two different chains produces
 * different canonical keys, preventing double-counting.
 */

import { describe, it, expect } from "vitest";
import { canonicalTxKey } from "../../src/evm/reorg-detector.js";

describe("canonicalTxKey", () => {
  it("produces chainId-prefixed key", () => {
    const key = canonicalTxKey("eip155:1", "0xdeadbeef");
    expect(key).toBe("eip155:1:0xdeadbeef");
  });

  it("same txHash on different chains produces different keys", () => {
    const txHash = "0xaaaa";
    const ethereumKey = canonicalTxKey("eip155:1", txHash);
    const arbitrumKey = canonicalTxKey("eip155:42161", txHash);
    const baseKey = canonicalTxKey("eip155:8453", txHash);

    expect(ethereumKey).not.toBe(arbitrumKey);
    expect(ethereumKey).not.toBe(baseKey);
    expect(arbitrumKey).not.toBe(baseKey);
  });

  it("same txHash on same chain produces same key", () => {
    const key1 = canonicalTxKey("eip155:1", "0xabc");
    const key2 = canonicalTxKey("eip155:1", "0xabc");
    expect(key1).toBe(key2);
  });

  it("works with Solana chain IDs", () => {
    const key = canonicalTxKey("solana:mainnet-beta", "5VERv8NMvr");
    expect(key).toBe("solana:mainnet-beta:5VERv8NMvr");
  });

  it("works with XRPL chain IDs", () => {
    const key = canonicalTxKey("xrpl:main", "ABC123");
    expect(key).toBe("xrpl:main:ABC123");
  });

  it("canonical keys form a unique set across chains", () => {
    const txHash = "0xsharedtx";
    const keys = new Set([
      canonicalTxKey("eip155:1", txHash),
      canonicalTxKey("eip155:42161", txHash),
      canonicalTxKey("eip155:8453", txHash),
      canonicalTxKey("eip155:10", txHash),
      canonicalTxKey("solana:mainnet-beta", txHash),
    ]);

    expect(keys.size).toBe(5);
  });
});
