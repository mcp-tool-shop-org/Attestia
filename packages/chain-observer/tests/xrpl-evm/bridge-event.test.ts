/**
 * Tests for bridge event types and normalization.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeBridgeEvent,
  isBridgeContract,
  bridgeEventKey,
  KNOWN_BRIDGE_CONTRACTS,
} from "../../src/xrpl-evm/bridge-event.js";

describe("normalizeBridgeEvent", () => {
  it("normalizes addresses and tx hashes to lowercase", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xABCD1234",
      destTxHash: "0xEF567890",
      amount: "1000000",
      symbol: "XRP",
      sender: "0xSENDER",
      recipient: "0xRECIPIENT",
      sourceTimestamp: "2025-01-01T00:00:00Z",
      destTimestamp: "2025-01-01T00:00:30Z",
    });

    expect(event.sourceTxHash).toBe("0xabcd1234");
    expect(event.destTxHash).toBe("0xef567890");
    expect(event.sender).toBe("0xsender");
    expect(event.recipient).toBe("0xrecipient");
  });

  it("strips leading zeros from amount", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xabc",
      amount: "000100",
      symbol: "XRP",
      sender: "0xsender",
      recipient: "0xrecipient",
      sourceTimestamp: "2025-01-01T00:00:00Z",
    });

    expect(event.amount).toBe("100");
  });

  it("keeps '0' amount as-is", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xabc",
      amount: "0",
      symbol: "XRP",
      sender: "0xsender",
      recipient: "0xrecipient",
      sourceTimestamp: "2025-01-01T00:00:00Z",
    });

    expect(event.amount).toBe("0");
  });

  it("derives status 'pending' when destTxHash is missing", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xabc",
      amount: "5000000",
      symbol: "XRP",
      sender: "0xsender",
      recipient: "0xrecipient",
      sourceTimestamp: "2025-01-01T00:00:00Z",
    });

    expect(event.status).toBe("pending");
    expect(event.destTxHash).toBeUndefined();
  });

  it("derives status 'confirmed' when destTxHash is present", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xabc",
      destTxHash: "0xdef",
      amount: "5000000",
      symbol: "XRP",
      sender: "0xsender",
      recipient: "0xrecipient",
      sourceTimestamp: "2025-01-01T00:00:00Z",
      destTimestamp: "2025-01-01T00:00:30Z",
    });

    expect(event.status).toBe("confirmed");
  });

  it("respects explicit status override", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xabc",
      destTxHash: "0xdef",
      status: "failed",
      amount: "5000000",
      symbol: "XRP",
      sender: "0xsender",
      recipient: "0xrecipient",
      sourceTimestamp: "2025-01-01T00:00:00Z",
    });

    expect(event.status).toBe("failed");
  });

  it("replay determinism: two normalizations of same data produce identical output", () => {
    const input = {
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xABC",
      destTxHash: "0xDEF",
      amount: "00100",
      symbol: "XRP",
      sender: "0xSENDER",
      recipient: "0xRECIPIENT",
      sourceTimestamp: "2025-01-01T00:00:00Z",
      destTimestamp: "2025-01-01T00:00:30Z",
    };

    const run1 = JSON.stringify(normalizeBridgeEvent(input));
    const run2 = JSON.stringify(normalizeBridgeEvent(input));

    expect(run1).toBe(run2);
  });

  it("includes bridgeProofRef when provided", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xabc",
      amount: "1000",
      symbol: "XRP",
      sender: "0xsender",
      recipient: "0xrecipient",
      sourceTimestamp: "2025-01-01T00:00:00Z",
      bridgeProofRef: "attestation:hash123",
    });

    expect(event.bridgeProofRef).toBe("attestation:hash123");
  });

  it("omits optional fields when not provided", () => {
    const event = normalizeBridgeEvent({
      sourceChainId: "xrpl:main",
      destChainId: "eip155:1440002",
      sourceTxHash: "0xabc",
      amount: "1000",
      symbol: "XRP",
      sender: "0xsender",
      recipient: "0xrecipient",
      sourceTimestamp: "2025-01-01T00:00:00Z",
    });

    expect("destTxHash" in event).toBe(false);
    expect("destTimestamp" in event).toBe(false);
    expect("bridgeProofRef" in event).toBe(false);
  });
});

describe("isBridgeContract", () => {
  it("returns true for known bridge contract", () => {
    const addr = [...KNOWN_BRIDGE_CONTRACTS][0]!;
    expect(isBridgeContract(addr)).toBe(true);
  });

  it("is case-insensitive", () => {
    const addr = [...KNOWN_BRIDGE_CONTRACTS][0]!.toUpperCase();
    expect(isBridgeContract(addr)).toBe(true);
  });

  it("returns false for unknown address", () => {
    expect(isBridgeContract("0xdeadbeef")).toBe(false);
  });
});

describe("bridgeEventKey", () => {
  it("creates canonical key from chain ID and tx hash", () => {
    const key = bridgeEventKey("xrpl:main", "0xABC123");
    expect(key).toBe("bridge:xrpl:main:0xabc123");
  });

  it("is deterministic", () => {
    const key1 = bridgeEventKey("eip155:1440002", "0xDEF");
    const key2 = bridgeEventKey("eip155:1440002", "0xDEF");
    expect(key1).toBe(key2);
  });
});
