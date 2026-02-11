/**
 * RFC 8785 (JCS) Canonicalization Determinism Tests
 *
 * Verifies that the json-canonicalize implementation produces
 * deterministic output across key orderings, nested structures,
 * number edge cases, and Unicode content.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import {
  buildReconciliationPayload,
  buildRegistrumPayload,
  verifyPayloadHash,
} from "../src/payload.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// ============================================================================
// RFC 8785 core determinism
// ============================================================================

describe("RFC 8785 canonicalization", () => {
  describe("key ordering stability", () => {
    it("same object → same bytes (stable)", () => {
      const obj = { zebra: 1, alpha: 2, middle: 3 };
      const a = canonicalize(obj);
      const b = canonicalize(obj);
      expect(a).toBe(b);
    });

    it("key order differences → same bytes", () => {
      const obj1 = { z: 1, a: 2, m: 3 };
      const obj2 = { a: 2, z: 1, m: 3 };
      const obj3 = { m: 3, a: 2, z: 1 };

      const c1 = canonicalize(obj1);
      const c2 = canonicalize(obj2);
      const c3 = canonicalize(obj3);

      expect(c1).toBe(c2);
      expect(c2).toBe(c3);
    });

    it("keys are sorted lexicographically in output", () => {
      const obj = { c: 3, a: 1, b: 2 };
      const result = canonicalize(obj);
      expect(result).toBe('{"a":1,"b":2,"c":3}');
    });
  });

  describe("nested structures", () => {
    it("nested objects are canonicalized recursively", () => {
      const obj1 = { outer: { z: 1, a: { z: 2, a: 3 } } };
      const obj2 = { outer: { a: { a: 3, z: 2 }, z: 1 } };

      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it("arrays preserve element order (not sorted)", () => {
      const obj = { arr: [3, 1, 2] };
      expect(canonicalize(obj)).toBe('{"arr":[3,1,2]}');
    });

    it("arrays of objects are canonicalized per-element", () => {
      const obj1 = { items: [{ z: 1, a: 2 }, { b: 3, a: 4 }] };
      const obj2 = { items: [{ a: 2, z: 1 }, { a: 4, b: 3 }] };

      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it("deeply nested structures produce consistent output", () => {
      const deep = {
        level1: {
          z: {
            level3: {
              b: [{ d: 4, c: 3 }],
              a: "value",
            },
          },
          a: 1,
        },
      };

      const result1 = canonicalize(deep);
      const result2 = canonicalize(deep);
      expect(result1).toBe(result2);

      // Verify the structure is parseable and correct
      const parsed = JSON.parse(result1);
      expect(parsed.level1.z.level3.a).toBe("value");
      expect(parsed.level1.z.level3.b[0].c).toBe(3);
    });
  });

  describe("number formatting", () => {
    it("integer zero", () => {
      expect(canonicalize({ n: 0 })).toBe('{"n":0}');
    });

    it("negative zero becomes 0 (RFC 8785 requirement)", () => {
      // RFC 8785 Section 3.2.2.3: -0 must be serialized as 0
      const result = canonicalize({ n: -0 });
      expect(result).toBe('{"n":0}');
    });

    it("1.0 vs 1 produce same output", () => {
      const a = canonicalize({ n: 1.0 });
      const b = canonicalize({ n: 1 });
      expect(a).toBe(b);
    });

    it("large integers", () => {
      const obj = { n: 9007199254740991 }; // Number.MAX_SAFE_INTEGER
      const result = canonicalize(obj);
      expect(result).toBe('{"n":9007199254740991}');
    });

    it("floating-point values", () => {
      const obj = { n: 3.14 };
      const result = canonicalize(obj);
      expect(result).toBe('{"n":3.14}');
    });

    it("very small numbers", () => {
      const obj = { n: 0.000001 };
      const r1 = canonicalize(obj);
      const r2 = canonicalize(obj);
      expect(r1).toBe(r2);
    });
  });

  describe("special values", () => {
    it("null", () => {
      expect(canonicalize({ n: null })).toBe('{"n":null}');
    });

    it("booleans", () => {
      expect(canonicalize({ t: true, f: false })).toBe('{"f":false,"t":true}');
    });

    it("empty object", () => {
      expect(canonicalize({})).toBe("{}");
    });

    it("empty array", () => {
      expect(canonicalize({ a: [] })).toBe('{"a":[]}');
    });

    it("empty string", () => {
      expect(canonicalize({ s: "" })).toBe('{"s":""}');
    });
  });

  describe("Unicode", () => {
    it("basic multilingual plane characters", () => {
      const obj1 = { name: "caf\u00e9" };
      const obj2 = { name: "caf\u00e9" };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });

    it("CJK characters", () => {
      const obj = { text: "\u4e16\u754c" }; // 世界
      const r1 = canonicalize(obj);
      const r2 = canonicalize(obj);
      expect(r1).toBe(r2);
    });

    it("emoji", () => {
      const obj = { icon: "\ud83d\ude00" }; // 😀
      const r1 = canonicalize(obj);
      const r2 = canonicalize(obj);
      expect(r1).toBe(r2);
    });

    it("mixed scripts in keys", () => {
      const obj1 = { "\u03b1": 1, "a": 2, "\u4e00": 3 }; // α, a, 一
      const obj2 = { "a": 2, "\u4e00": 3, "\u03b1": 1 };
      expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });
  });

  describe("string escaping", () => {
    it("control characters are escaped", () => {
      const obj = { s: "line1\nline2\ttab" };
      const result = canonicalize(obj);
      expect(result).toContain("\\n");
      expect(result).toContain("\\t");
    });

    it("backslash is escaped", () => {
      const obj = { path: "C:\\Users" };
      const result = canonicalize(obj);
      expect(result).toContain("\\\\");
    });

    it("quotes are escaped", () => {
      const obj = { s: 'say "hello"' };
      const result = canonicalize(obj);
      expect(result).toContain('\\"');
    });
  });
});

// ============================================================================
// Hashing over canonical bytes
// ============================================================================

describe("SHA-256 over canonical output", () => {
  it("hash is computed from canonical string only", () => {
    const obj = { z: 1, a: 2 };
    const canonical = canonicalize(obj);
    const expected = sha256(canonical);

    // Same object with different key order should hash the same
    const obj2 = { a: 2, z: 1 };
    const canonical2 = canonicalize(obj2);
    const hash2 = sha256(canonical2);

    expect(hash2).toBe(expected);
  });

  it("no incidental whitespace affects hash", () => {
    const obj = { key: "value", nested: { a: 1 } };
    const canonical = canonicalize(obj);

    // Canonical output should have no whitespace between tokens
    expect(canonical).not.toMatch(/\s*:\s/);
    expect(canonical).not.toMatch(/,\s/);
  });

  it("hash changes with any content change", () => {
    const base = canonicalize({ a: 1, b: 2 });
    const changed = canonicalize({ a: 1, b: 3 });

    expect(sha256(base)).not.toBe(sha256(changed));
  });
});

// ============================================================================
// Attestia payload integration
// ============================================================================

function makeReport(overrides: Partial<ReconciliationReport> = {}): ReconciliationReport {
  return {
    id: "recon-jcs-1",
    scope: {},
    timestamp: "2024-01-01T00:00:00Z",
    intentLedgerMatches: [],
    ledgerChainMatches: [],
    intentChainMatches: [],
    summary: {
      totalIntents: 5,
      totalLedgerEntries: 10,
      totalChainEvents: 3,
      matchedCount: 5,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
    ...overrides,
  };
}

function makeAttestation(overrides: Partial<AttestationRecord> = {}): AttestationRecord {
  return {
    id: "att:recon-jcs-1",
    reconciliationId: "recon-jcs-1",
    allReconciled: true,
    summary: {
      totalIntents: 5,
      totalLedgerEntries: 10,
      totalChainEvents: 3,
      matchedCount: 5,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
    attestedBy: "test-attestor",
    attestedAt: "2024-01-01T00:00:01Z",
    reportHash: "abcdef1234567890",
    ...overrides,
  };
}

describe("payload builder uses RFC 8785 canonicalization", () => {
  it("reconciliation payloads verify after construction", () => {
    const payload = buildReconciliationPayload(makeReport(), makeAttestation());
    expect(verifyPayloadHash(payload)).toBe(true);
  });

  it("registrum payloads verify after construction", () => {
    const payload = buildRegistrumPayload("state-1", 42, "registrum-witness");
    expect(verifyPayloadHash(payload)).toBe(true);
  });

  it("payload hash is deterministic across repeated builds", () => {
    // Fix timestamp to ensure determinism
    const now = "2024-06-01T12:00:00.000Z";
    const origDate = Date;
    globalThis.Date = class extends origDate {
      constructor(...args: [] | [string | number | Date]) {
        if (args.length === 0) {
          super(now);
        } else {
          super(args[0]);
        }
      }

      toISOString(): string {
        return now;
      }

      static now(): number {
        return new origDate(now).getTime();
      }
    } as DateConstructor;

    try {
      const hashes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const payload = buildReconciliationPayload(makeReport(), makeAttestation());
        hashes.add(payload.hash);
      }
      expect(hashes.size).toBe(1);
    } finally {
      globalThis.Date = origDate;
    }
  });

  it("tampered payload fails verification", () => {
    const payload = buildReconciliationPayload(makeReport(), makeAttestation());
    const tampered = {
      ...payload,
      summary: { ...payload.summary, matchedCount: 999 },
    };
    expect(verifyPayloadHash(tampered)).toBe(false);
  });
});
