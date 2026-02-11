/**
 * Tests for cross-chain reconciliation rules.
 */

import { describe, it, expect } from "vitest";
import {
  isSettlementPair,
  getSettlementChain,
  preventDoubleCounting,
  linkCrossChainEvents,
} from "../src/cross-chain-rules.js";
import type { CrossChainEvent } from "../src/cross-chain-rules.js";

function makeEvent(
  chainId: string,
  overrides: Partial<CrossChainEvent> = {},
): CrossChainEvent {
  return {
    chainId,
    txHash: `0x${chainId}-tx`,
    blockNumber: 100,
    amount: "1000000000000000000",
    symbol: "ETH",
    from: "0xsender",
    to: "0xreceiver",
    timestamp: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("isSettlementPair", () => {
  it("Arbitrum settles on Ethereum", () => {
    expect(isSettlementPair("eip155:42161", "eip155:1")).toBe(true);
    expect(isSettlementPair("eip155:1", "eip155:42161")).toBe(true);
  });

  it("Optimism settles on Ethereum", () => {
    expect(isSettlementPair("eip155:10", "eip155:1")).toBe(true);
  });

  it("Base settles on Ethereum", () => {
    expect(isSettlementPair("eip155:8453", "eip155:1")).toBe(true);
  });

  it("two L2s are not a settlement pair", () => {
    expect(isSettlementPair("eip155:42161", "eip155:10")).toBe(false);
  });

  it("Polygon is not a settlement pair with Ethereum", () => {
    expect(isSettlementPair("eip155:137", "eip155:1")).toBe(false);
  });

  it("Solana is not a settlement pair with anything", () => {
    expect(isSettlementPair("solana:mainnet-beta", "eip155:1")).toBe(false);
  });
});

describe("getSettlementChain", () => {
  it("returns Ethereum for Arbitrum", () => {
    expect(getSettlementChain("eip155:42161")).toBe("eip155:1");
  });

  it("returns undefined for Ethereum L1", () => {
    expect(getSettlementChain("eip155:1")).toBeUndefined();
  });

  it("returns undefined for unknown chain", () => {
    expect(getSettlementChain("eip155:999")).toBeUndefined();
  });
});

describe("preventDoubleCounting", () => {
  it("keeps all events when no settlement pairs exist", () => {
    const events = [
      makeEvent("eip155:42161", { txHash: "0xa" }),
      makeEvent("eip155:10", { txHash: "0xb" }),
    ];

    const result = preventDoubleCounting(events);

    expect(result.kept.length).toBe(2);
    expect(result.removed.length).toBe(0);
  });

  it("removes L1 settlement artifact when L2 event matches", () => {
    const events = [
      makeEvent("eip155:42161", { txHash: "0xarb-tx" }), // L2 event
      makeEvent("eip155:1", { txHash: "0xeth-settlement" }), // L1 settlement
    ];

    const result = preventDoubleCounting(events);

    expect(result.kept.length).toBe(1);
    expect(result.kept[0]!.chainId).toBe("eip155:42161"); // L2 kept
    expect(result.removed.length).toBe(1);
    expect(result.removed[0]!.chainId).toBe("eip155:1"); // L1 removed
  });

  it("keeps both events when amounts differ", () => {
    const events = [
      makeEvent("eip155:42161", { amount: "100" }),
      makeEvent("eip155:1", { amount: "200" }),
    ];

    const result = preventDoubleCounting(events);

    expect(result.kept.length).toBe(2);
    expect(result.removed.length).toBe(0);
  });

  it("keeps both events when symbols differ", () => {
    const events = [
      makeEvent("eip155:42161", { symbol: "ETH" }),
      makeEvent("eip155:1", { symbol: "USDC" }),
    ];

    const result = preventDoubleCounting(events);

    expect(result.kept.length).toBe(2);
    expect(result.removed.length).toBe(0);
  });

  it("handles multiple L2s settling on same L1", () => {
    const events = [
      makeEvent("eip155:42161", { txHash: "0xarb" }),
      makeEvent("eip155:10", { txHash: "0xop" }),
      makeEvent("eip155:1", { txHash: "0xeth1" }),
    ];

    const result = preventDoubleCounting(events);

    // Both L2 events should be kept, L1 should be removed
    expect(result.kept.length).toBe(2);
    expect(result.removed.length).toBe(1);
  });

  it("handles events from non-settlement chains", () => {
    const events = [
      makeEvent("solana:mainnet-beta", { txHash: "0xsol" }),
      makeEvent("eip155:1", { txHash: "0xeth" }),
    ];

    const result = preventDoubleCounting(events);

    expect(result.kept.length).toBe(2);
    expect(result.removed.length).toBe(0);
  });
});

describe("linkCrossChainEvents", () => {
  it("links events with matching amount and symbol", () => {
    const events = [
      makeEvent("eip155:42161", { txHash: "0xa" }),
      makeEvent("eip155:1", { txHash: "0xb" }),
    ];

    const links = linkCrossChainEvents(events);

    expect(links.length).toBe(1);
    expect(links[0]!.linkType).toBe("settlement");
    expect(links[0]!.confidence).toBe("high");
  });

  it("does not link events on the same chain", () => {
    const events = [
      makeEvent("eip155:1", { txHash: "0xa" }),
      makeEvent("eip155:1", { txHash: "0xb" }),
    ];

    const links = linkCrossChainEvents(events);
    expect(links.length).toBe(0);
  });

  it("uses structural link type for non-settlement pairs", () => {
    const events = [
      makeEvent("eip155:42161", { txHash: "0xa" }),
      makeEvent("solana:mainnet-beta", { txHash: "0xb" }),
    ];

    const links = linkCrossChainEvents(events);

    expect(links.length).toBe(1);
    expect(links[0]!.linkType).toBe("structural");
  });

  it("reports discrepancies in links", () => {
    const events = [
      makeEvent("eip155:42161", { txHash: "0xa", amount: "100" }),
      makeEvent("eip155:1", { txHash: "0xb", amount: "200" }),
    ];

    const links = linkCrossChainEvents(events);

    // Still linked because symbol + address overlap match (2/3)
    expect(links.length).toBe(1);
    expect(links[0]!.confidence).toBe("medium");
    expect(links[0]!.discrepancies.length).toBeGreaterThan(0);
  });

  it("does not link events with fewer than 2 matching criteria", () => {
    const events = [
      makeEvent("eip155:42161", {
        txHash: "0xa",
        amount: "100",
        symbol: "ETH",
        from: "0xAAA",
        to: "0xBBB",
      }),
      makeEvent("eip155:1", {
        txHash: "0xb",
        amount: "999",
        symbol: "USDC",
        from: "0xCCC",
        to: "0xDDD",
      }),
    ];

    const links = linkCrossChainEvents(events);
    expect(links.length).toBe(0);
  });
});
