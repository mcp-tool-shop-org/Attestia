/**
 * Invariant Metadata Parity Tests
 *
 * Tests that both systems expose the same invariant metadata:
 * - Same invariant IDs
 * - Same scopes
 * - Same failure modes
 *
 * This ensures the registry system is a faithful representation
 * of the legacy invariant definitions.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  createRegistrarPair,
  expectInvariantListParity,
} from "./parity.helpers";

import type { StructuralRegistrar } from "../../src/structural-registrar";
import type { RegistryDrivenRegistrar } from "../../src/registry/index";

describe("Invariant Metadata Parity", () => {
  let legacy: StructuralRegistrar;
  let registry: RegistryDrivenRegistrar;

  beforeEach(() => {
    const pair = createRegistrarPair();
    legacy = pair.legacy;
    registry = pair.registry;
  });

  it("both systems list exactly 11 invariants", () => {
    const legacyInvariants = legacy.listInvariants();
    const registryInvariants = registry.listInvariants();

    expect(legacyInvariants.length).toBe(11);
    expect(registryInvariants.length).toBe(11);
  });

  it("invariant IDs match exactly", () => {
    const legacyIds = new Set(legacy.listInvariants().map((i) => i.id));
    const registryIds = new Set(registry.listInvariants().map((i) => i.id));

    expect(registryIds).toEqual(legacyIds);
  });

  it("all invariant metadata matches", () => {
    expectInvariantListParity(legacy, registry);
  });

  describe("Identity invariants metadata", () => {
    const identityInvariants = [
      "state.identity.explicit",
      "state.identity.immutable",
      "state.identity.unique",
    ];

    for (const id of identityInvariants) {
      it(`${id} has matching metadata`, () => {
        const legacyInv = legacy.listInvariants().find((i) => i.id === id);
        const registryInv = registry.listInvariants().find((i) => i.id === id);

        expect(legacyInv).toBeDefined();
        expect(registryInv).toBeDefined();

        if (legacyInv && registryInv) {
          expect(registryInv.scope).toBe(legacyInv.scope);
          expect(registryInv.failureMode).toBe(legacyInv.failureMode);
        }
      });
    }
  });

  describe("Lineage invariants metadata", () => {
    const lineageInvariants = [
      "state.lineage.explicit",
      "state.lineage.parent_exists",
      "state.lineage.single_parent",
      "state.lineage.continuous",
    ];

    for (const id of lineageInvariants) {
      it(`${id} has matching metadata`, () => {
        const legacyInv = legacy.listInvariants().find((i) => i.id === id);
        const registryInv = registry.listInvariants().find((i) => i.id === id);

        expect(legacyInv).toBeDefined();
        expect(registryInv).toBeDefined();

        if (legacyInv && registryInv) {
          expect(registryInv.scope).toBe(legacyInv.scope);
          expect(registryInv.failureMode).toBe(legacyInv.failureMode);
        }
      });
    }
  });

  describe("Ordering invariants metadata", () => {
    const orderingInvariants = [
      "ordering.total",
      "ordering.deterministic",
      "ordering.monotonic",
      "ordering.non_semantic",
    ];

    for (const id of orderingInvariants) {
      it(`${id} has matching metadata`, () => {
        const legacyInv = legacy.listInvariants().find((i) => i.id === id);
        const registryInv = registry.listInvariants().find((i) => i.id === id);

        expect(legacyInv).toBeDefined();
        expect(registryInv).toBeDefined();

        if (legacyInv && registryInv) {
          expect(registryInv.scope).toBe(legacyInv.scope);
          expect(registryInv.failureMode).toBe(legacyInv.failureMode);
        }
      });
    }
  });

  describe("Failure mode distribution", () => {
    it("halt failure modes match", () => {
      const legacyHalts = legacy
        .listInvariants()
        .filter((i) => i.failureMode === "halt")
        .map((i) => i.id)
        .sort();

      const registryHalts = registry
        .listInvariants()
        .filter((i) => i.failureMode === "halt")
        .map((i) => i.id)
        .sort();

      expect(registryHalts).toEqual(legacyHalts);
    });

    it("reject failure modes match", () => {
      const legacyRejects = legacy
        .listInvariants()
        .filter((i) => i.failureMode === "reject")
        .map((i) => i.id)
        .sort();

      const registryRejects = registry
        .listInvariants()
        .filter((i) => i.failureMode === "reject")
        .map((i) => i.id)
        .sort();

      expect(registryRejects).toEqual(legacyRejects);
    });
  });

  describe("Scope distribution", () => {
    it("state-scope invariants match", () => {
      const legacyState = legacy
        .listInvariants()
        .filter((i) => i.scope === "state")
        .map((i) => i.id)
        .sort();

      const registryState = registry
        .listInvariants()
        .filter((i) => i.scope === "state")
        .map((i) => i.id)
        .sort();

      expect(registryState).toEqual(legacyState);
    });

    it("transition-scope invariants match", () => {
      const legacyTransition = legacy
        .listInvariants()
        .filter((i) => i.scope === "transition")
        .map((i) => i.id)
        .sort();

      const registryTransition = registry
        .listInvariants()
        .filter((i) => i.scope === "transition")
        .map((i) => i.id)
        .sort();

      expect(registryTransition).toEqual(legacyTransition);
    });

    it("registration-scope invariants match", () => {
      const legacyReg = legacy
        .listInvariants()
        .filter((i) => i.scope === "registration")
        .map((i) => i.id)
        .sort();

      const registryReg = registry
        .listInvariants()
        .filter((i) => i.scope === "registration")
        .map((i) => i.id)
        .sort();

      expect(registryReg).toEqual(legacyReg);
    });
  });
});
