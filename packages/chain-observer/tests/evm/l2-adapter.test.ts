/**
 * Tests for L2 adapter — gas normalization and receipt field extraction.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeL2Gas,
  extractL2ReceiptFields,
  isOpStackChain,
  isArbitrumChain,
  isL2Chain,
} from "../../src/evm/l2-adapter.js";

describe("L2 chain identification", () => {
  it("identifies OP Mainnet as OP Stack", () => {
    expect(isOpStackChain("eip155:10")).toBe(true);
  });

  it("identifies Base as OP Stack", () => {
    expect(isOpStackChain("eip155:8453")).toBe(true);
  });

  it("identifies Arbitrum One", () => {
    expect(isArbitrumChain("eip155:42161")).toBe(true);
  });

  it("does not identify Ethereum L1 as L2", () => {
    expect(isL2Chain("eip155:1")).toBe(false);
  });

  it("does not identify Polygon as OP Stack or Arbitrum", () => {
    expect(isOpStackChain("eip155:137")).toBe(false);
    expect(isArbitrumChain("eip155:137")).toBe(false);
  });

  it("identifies all L2s with isL2Chain", () => {
    expect(isL2Chain("eip155:10")).toBe(true);
    expect(isL2Chain("eip155:8453")).toBe(true);
    expect(isL2Chain("eip155:42161")).toBe(true);
  });
});

describe("normalizeL2Gas", () => {
  it("normalizes gas with L1 component", () => {
    const result = normalizeL2Gas("eip155:10", 500_000n, 100_000n);

    expect(result.chainId).toBe("eip155:10");
    expect(result.l2GasUsed).toBe(500_000n);
    expect(result.l1GasUsed).toBe(100_000n);
    expect(result.totalGas).toBe(600_000n);
  });

  it("defaults l1GasUsed to 0 when not provided", () => {
    const result = normalizeL2Gas("eip155:1", 21_000n);

    expect(result.l1GasUsed).toBe(0n);
    expect(result.totalGas).toBe(21_000n);
  });

  it("handles zero gas", () => {
    const result = normalizeL2Gas("eip155:42161", 0n, 0n);

    expect(result.totalGas).toBe(0n);
  });

  it("handles large gas values", () => {
    const l2 = 30_000_000n;
    const l1 = 5_000_000_000n;
    const result = normalizeL2Gas("eip155:42161", l2, l1);

    expect(result.totalGas).toBe(l2 + l1);
  });
});

describe("extractL2ReceiptFields", () => {
  describe("OP Stack chains", () => {
    it("extracts l1Fee from Optimism receipt (bigint)", () => {
      const receipt = {
        l1Fee: 123_456_789n,
        l1GasPrice: 50_000_000_000n,
        l1FeeScalar: "0.684",
      };

      const fields = extractL2ReceiptFields("eip155:10", receipt);

      expect(fields.l1Fee).toBe(123_456_789n);
      expect(fields.l1GasPrice).toBe(50_000_000_000n);
      expect(fields.l1FeeScalar).toBe("0.684");
    });

    it("extracts l1Fee from Base receipt (string values)", () => {
      const receipt = {
        l1Fee: "123456789",
        l1GasPrice: "50000000000",
        l1FeeScalar: "0.684",
      };

      const fields = extractL2ReceiptFields("eip155:8453", receipt);

      expect(fields.l1Fee).toBe(123_456_789n);
      expect(fields.l1GasPrice).toBe(50_000_000_000n);
    });

    it("extracts l1BlobBaseFee (post-Ecotone)", () => {
      const receipt = {
        l1Fee: 100n,
        l1BlobBaseFee: 42n,
      };

      const fields = extractL2ReceiptFields("eip155:10", receipt);

      expect(fields.l1BlobBaseFee).toBe(42n);
    });

    it("returns empty fields when receipt has no L2 data", () => {
      const fields = extractL2ReceiptFields("eip155:10", {});

      expect(fields.l1Fee).toBeUndefined();
      expect(fields.l1GasPrice).toBeUndefined();
    });
  });

  describe("Arbitrum chains", () => {
    it("extracts gasUsedForL1", () => {
      const receipt = {
        gasUsedForL1: 50_000n,
      };

      const fields = extractL2ReceiptFields("eip155:42161", receipt);

      expect(fields.l1Fee).toBe(50_000n);
    });

    it("extracts gasUsedForL1 from string", () => {
      const receipt = {
        gasUsedForL1: "50000",
      };

      const fields = extractL2ReceiptFields("eip155:42161", receipt);

      expect(fields.l1Fee).toBe(50_000n);
    });
  });

  describe("L1 chains", () => {
    it("returns empty fields for Ethereum L1", () => {
      const receipt = { gasUsed: 21_000n };
      const fields = extractL2ReceiptFields("eip155:1", receipt);

      expect(fields).toEqual({});
    });

    it("returns empty fields for unknown chain", () => {
      const receipt = { l1Fee: 100n };
      const fields = extractL2ReceiptFields("eip155:999", receipt);

      expect(fields).toEqual({});
    });
  });
});
