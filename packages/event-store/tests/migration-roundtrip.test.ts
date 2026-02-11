/**
 * Tests for event catalog migration roundtrip.
 *
 * Verifies that all 28 ATTESTIA_EVENTS are registered in the catalog
 * and can be upcasted from their current version.
 */

import { describe, it, expect } from "vitest";
import { createAtlestiaCatalog, ATTESTIA_EVENTS } from "../src/attestia-events.js";
import type { DomainEvent } from "@attestia/types";

describe("event catalog migration roundtrip", () => {
  const catalog = createAtlestiaCatalog();
  const allEventTypes = Object.values(ATTESTIA_EVENTS);

  it("catalog contains all 28 ATTESTIA_EVENTS", () => {
    expect(allEventTypes).toHaveLength(28);
    for (const type of allEventTypes) {
      expect(catalog.has(type)).toBe(true);
    }
  });

  it("each event type can be looked up with correct version", () => {
    for (const type of allEventTypes) {
      const schema = catalog.getSchema(type);
      expect(schema).toBeDefined();
      expect(schema!.version).toBeGreaterThanOrEqual(1);
    }
  });

  it("upcast from current version is identity (no migration needed)", () => {
    for (const type of allEventTypes) {
      const schema = catalog.getSchema(type)!;
      const event: DomainEvent = {
        type,
        metadata: { version: schema.version },
        payload: { test: true },
      };

      const upcasted = catalog.upcast(event, schema.version);
      expect(upcasted.type).toBe(type);
      expect(upcasted.payload).toEqual(event.payload);
    }
  });

  it("all event types have source defined", () => {
    for (const type of allEventTypes) {
      const schema = catalog.getSchema(type)!;
      expect(schema.source).toBeDefined();
      expect(["vault", "treasury", "registrum", "observer"]).toContain(
        schema.source,
      );
    }
  });

  it("event types are organized by subsystem", () => {
    const bySource: Record<string, string[]> = {};
    for (const type of allEventTypes) {
      const schema = catalog.getSchema(type)!;
      if (bySource[schema.source] === undefined) {
        bySource[schema.source] = [];
      }
      bySource[schema.source]!.push(type);
    }

    // All sources should have at least one event
    expect(Object.keys(bySource).length).toBeGreaterThanOrEqual(3);

    // Vault events should start with "vault."
    for (const type of bySource["vault"] ?? []) {
      expect(type.startsWith("vault.")).toBe(true);
    }
  });
});
