/**
 * ISO 27001 Mapping Tests
 *
 * Verifies:
 * - Framework metadata is correct
 * - All mapped controls are valid
 * - Evidence types are valid
 * - No duplicate control IDs
 */

import { describe, it, expect } from "vitest";
import { ISO27001_FRAMEWORK, ISO27001_MAPPINGS } from "../../src/compliance/iso27001-mapping.js";
import type { EvidenceType, ControlStatus } from "../../src/compliance/types.js";

const VALID_EVIDENCE_TYPES: readonly EvidenceType[] = [
  "hash-chain", "audit-log", "replay-verification", "merkle-proof",
  "multi-sig-governance", "reconciliation", "state-snapshot", "consensus",
];

const VALID_STATUSES: readonly ControlStatus[] = [
  "implemented", "partial", "planned", "not-applicable",
];

describe("ISO27001_FRAMEWORK", () => {
  it("has correct metadata", () => {
    expect(ISO27001_FRAMEWORK.id).toBe("iso27001");
    expect(ISO27001_FRAMEWORK.name).toContain("27001");
    expect(ISO27001_FRAMEWORK.version).toBeTruthy();
    expect(ISO27001_FRAMEWORK.description).toBeTruthy();
  });
});

describe("ISO27001_MAPPINGS", () => {
  it("has a non-trivial number of mappings", () => {
    expect(ISO27001_MAPPINGS.length).toBeGreaterThanOrEqual(10);
  });

  it("has no duplicate control IDs", () => {
    const ids = ISO27001_MAPPINGS.map((m) => m.controlId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all evidence types are valid", () => {
    for (const m of ISO27001_MAPPINGS) {
      for (const et of m.evidenceTypes) {
        expect(VALID_EVIDENCE_TYPES).toContain(et);
      }
    }
  });

  it("all statuses are valid", () => {
    for (const m of ISO27001_MAPPINGS) {
      expect(VALID_STATUSES).toContain(m.status);
    }
  });

  it("all mappings have required fields", () => {
    for (const m of ISO27001_MAPPINGS) {
      expect(m.controlId).toBeTruthy();
      expect(m.controlName).toBeTruthy();
      expect(m.controlDescription).toBeTruthy();
      expect(m.attestiaControl).toBeTruthy();
      expect(m.attestiaPackage).toBeTruthy();
      expect(m.evidenceTypes.length).toBeGreaterThan(0);
    }
  });

  it("covers Annex A sections", () => {
    const sections = new Set(
      ISO27001_MAPPINGS.map((m) => m.controlId.split(".")[0]),
    );
    // Should cover A sections
    expect(sections.has("A")).toBe(true);
  });
});
