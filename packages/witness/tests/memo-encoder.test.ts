/**
 * Memo encoder tests
 *
 * Tests hex encoding/decoding of XRPL transaction memos.
 */
import { describe, it, expect } from "vitest";
import {
  encodeMemo,
  decodeMemo,
  isAttestiaMemo,
  toHex,
  fromHex,
  MEMO_TYPE,
  MEMO_FORMAT,
} from "../src/memo-encoder.js";
import type { AttestationPayload, XrplMemo } from "../src/types.js";

function makePayload(): AttestationPayload {
  return {
    hash: "abc123def456",
    timestamp: "2024-01-01T00:00:00Z",
    source: {
      kind: "reconciliation",
      reportId: "recon-1",
      reportHash: "deadbeef",
    },
    summary: {
      clean: true,
      matchedCount: 5,
      mismatchCount: 0,
      missingCount: 0,
      attestedBy: "test-attestor",
    },
  };
}

describe("toHex / fromHex", () => {
  it("round-trips ASCII strings", () => {
    expect(fromHex(toHex("hello world"))).toBe("hello world");
  });

  it("round-trips JSON strings", () => {
    const json = JSON.stringify({ key: "value", num: 42 });
    expect(fromHex(toHex(json))).toBe(json);
  });

  it("round-trips the memo type constant", () => {
    expect(fromHex(toHex(MEMO_TYPE))).toBe(MEMO_TYPE);
  });

  it("produces uppercase hex", () => {
    const hex = toHex("abc");
    expect(hex).toBe(hex.toUpperCase());
  });
});

describe("encodeMemo", () => {
  it("encodes payload as hex memo fields", () => {
    const payload = makePayload();
    const memo = encodeMemo(payload);

    expect(fromHex(memo.MemoType)).toBe(MEMO_TYPE);
    expect(memo.MemoFormat).toBeDefined();
    expect(fromHex(memo.MemoFormat!)).toBe(MEMO_FORMAT);

    // MemoData should be hex-encoded JSON of the payload
    const decoded = JSON.parse(fromHex(memo.MemoData));
    expect(decoded.hash).toBe(payload.hash);
    expect(decoded.source.kind).toBe("reconciliation");
  });
});

describe("decodeMemo", () => {
  it("decodes a valid memo back to payload", () => {
    const payload = makePayload();
    const memo = encodeMemo(payload);
    const decoded = decodeMemo(memo);

    expect(decoded.hash).toBe(payload.hash);
    expect(decoded.timestamp).toBe(payload.timestamp);
    expect(decoded.source).toEqual(payload.source);
    expect(decoded.summary).toEqual(payload.summary);
  });

  it("throws on wrong memo type", () => {
    const badMemo: XrplMemo = {
      MemoType: toHex("wrong/type"),
      MemoData: toHex("{}"),
    };

    expect(() => decodeMemo(badMemo)).toThrow(/unexpected memo type/i);
  });

  it("throws on invalid JSON in memo data", () => {
    const badMemo: XrplMemo = {
      MemoType: toHex(MEMO_TYPE),
      MemoData: toHex("not json {{{"),
    };

    expect(() => decodeMemo(badMemo)).toThrow(/failed to parse/i);
  });
});

describe("isAttestiaMemo", () => {
  it("returns true for Attestia memos", () => {
    const memo = encodeMemo(makePayload());
    expect(isAttestiaMemo(memo)).toBe(true);
  });

  it("returns false for non-Attestia memos", () => {
    const memo: XrplMemo = {
      MemoType: toHex("other/type"),
      MemoData: toHex("data"),
    };
    expect(isAttestiaMemo(memo)).toBe(false);
  });

  it("returns false for invalid hex", () => {
    const memo: XrplMemo = {
      MemoType: "not-valid-hex-!!!",
      MemoData: toHex("data"),
    };
    expect(isAttestiaMemo(memo)).toBe(false);
  });
});

describe("round-trip", () => {
  it("encode → decode produces identical payload", () => {
    const original = makePayload();
    const memo = encodeMemo(original);
    const decoded = decodeMemo(memo);
    expect(decoded).toEqual(original);
  });
});
