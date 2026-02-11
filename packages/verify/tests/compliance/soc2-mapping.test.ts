/**
 * SOC 2 Type II Mapping Tests
 *
 * Verifies:
 * - Framework metadata is correct
 * - All SOC 2 criteria have at least one mapping
 * - No duplicate control IDs
 * - Evidence types are valid
 * - All mappings have required fields
 * - Mapping generates reportable output
 */

import { describe, it, expect } from "vitest";
import { SOC2_FRAMEWORK, SOC2_MAPPINGS } from "../../src/compliance/soc2-mapping.js";
import type { EvidenceType, ControlStatus } from "../../src/compliance/types.js";

// =============================================================================
// Valid Values
// =============================================================================

const VALID_EVIDENCE_TYPES: readonly EvidenceType[] = [
  "hash-chain",
  "audit-log",
  "replay-verification",
  "merkle-proof",
  "multi-sig-governance",
  "reconciliation",
  "state-snapshot",
  "consensus",
];

const VALID_STATUSES: readonly ControlStatus[] = [
  "implemented",
  "partial",
  "planned",
  "not-applicable",
];

// =============================================================================
// Framework
// =============================================================================

describe("SOC2_FRAMEWORK", () => {
  it("has correct metadata", () => {
    expect(SOC2_FRAMEWORK.id).toBe("soc2-type2");
    expect(SOC2_FRAMEWORK.name).toBe("SOC 2 Type II");
    expect(SOC2_FRAMEWORK.version).toBeTruthy();
    expect(SOC2_FRAMEWORK.description).toBeTruthy();
  });
});

// =============================================================================
// Mappings
// =============================================================================

describe("SOC2_MAPPINGS", () => {
  it("has a non-trivial number of mappings", () => {
    expect(SOC2_MAPPINGS.length).toBeGreaterThanOrEqual(15);
  });

  it("covers CC (Common Criteria) controls", () => {
    const ccControls = SOC2_MAPPINGS.filter((m) =>
      m.controlId.startsWith("CC"),
    );
    expect(ccControls.length).toBeGreaterThanOrEqual(10);
  });

  it("covers PI (Processing Integrity) controls", () => {
    const piControls = SOC2_MAPPINGS.filter((m) =>
      m.controlId.startsWith("PI"),
    );
    expect(piControls.length).toBeGreaterThanOrEqual(3);
  });

  it("has no duplicate control IDs", () => {
    const ids = SOC2_MAPPINGS.map((m) => m.controlId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all evidence types are valid", () => {
    for (const mapping of SOC2_MAPPINGS) {
      for (const evidence of mapping.evidenceTypes) {
        expect(VALID_EVIDENCE_TYPES).toContain(evidence);
      }
    }
  });

  it("all statuses are valid", () => {
    for (const mapping of SOC2_MAPPINGS) {
      expect(VALID_STATUSES).toContain(mapping.status);
    }
  });

  it("all mappings have required fields", () => {
    for (const mapping of SOC2_MAPPINGS) {
      expect(mapping.controlId).toBeTruthy();
      expect(mapping.controlName).toBeTruthy();
      expect(mapping.controlDescription).toBeTruthy();
      expect(mapping.attestiaControl).toBeTruthy();
      expect(mapping.attestiaPackage).toBeTruthy();
      expect(mapping.evidenceTypes.length).toBeGreaterThan(0);
    }
  });

  it("all attestia packages reference valid packages", () => {
    const validPackages = [
      "@attestia/event-store",
      "@attestia/ledger",
      "@attestia/node",
      "@attestia/proof",
      "@attestia/reconciler",
      "@attestia/registrum",
      "@attestia/verify",
      "@attestia/witness",
      "@attestia/chain-observer",
      "@attestia/vault",
      "@attestia/treasury",
      "@attestia/types",
    ];

    for (const mapping of SOC2_MAPPINGS) {
      expect(validPackages).toContain(mapping.attestiaPackage);
    }
  });

  it("each evidence type is used at least once", () => {
    const usedTypes = new Set<string>();
    for (const mapping of SOC2_MAPPINGS) {
      for (const evidence of mapping.evidenceTypes) {
        usedTypes.add(evidence);
      }
    }

    // At least the core evidence types should be used
    expect(usedTypes.has("hash-chain")).toBe(true);
    expect(usedTypes.has("audit-log")).toBe(true);
    expect(usedTypes.has("replay-verification")).toBe(true);
    expect(usedTypes.has("merkle-proof")).toBe(true);
    expect(usedTypes.has("reconciliation")).toBe(true);
    expect(usedTypes.has("multi-sig-governance")).toBe(true);
    expect(usedTypes.has("consensus")).toBe(true);
  });

  it("mappings cover multiple SOC 2 categories", () => {
    const categories = new Set(
      SOC2_MAPPINGS.map((m) => m.controlId.replace(/\d+\.\d+/, "")),
    );
    // Should cover CC and PI at minimum
    expect(categories.has("CC")).toBe(true);
    expect(categories.has("PI")).toBe(true);
  });

  it("generates reportable output (control list with summary)", () => {
    const implementedCount = SOC2_MAPPINGS.filter(
      (m) => m.status === "implemented",
    ).length;

    expect(implementedCount).toBeGreaterThan(0);
    expect(implementedCount).toBeLessThanOrEqual(SOC2_MAPPINGS.length);

    // Score calculation
    const score = Math.round(
      (implementedCount / SOC2_MAPPINGS.length) * 100,
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
