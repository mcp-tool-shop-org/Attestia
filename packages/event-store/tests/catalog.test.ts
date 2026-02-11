/**
 * Tests for EventCatalog, schema versioning, and migration.
 *
 * Verifies:
 * - Schema registration and lookup
 * - Payload validation against schemas
 * - Schema version migration (v1 → v2 → v3)
 * - Forward compatibility (unknown events preserved)
 * - Versioned event creation and schema extraction
 * - Attestia catalog factory (all 21 event types)
 */

import { describe, it, expect } from "vitest";
import type { DomainEvent, EventMetadata } from "@attestia/types";
import type { EventSchema } from "../src/catalog.js";
import {
  EventCatalog,
  CatalogError,
  createVersionedEvent,
  getSchemaVersion,
} from "../src/catalog.js";
import {
  ATTESTIA_EVENTS,
  createAtlestiaCatalog,
} from "../src/attestia-events.js";

// =============================================================================
// Helpers
// =============================================================================

function makeSchema(
  type: string,
  version = 1,
  source: EventMetadata["source"] = "vault",
): EventSchema {
  return {
    type,
    version,
    description: `Test schema for ${type}`,
    source,
    validate: (p): p is { id: string } =>
      typeof p === "object" && p !== null && "id" in p,
  };
}

function makeMetadata(): EventMetadata {
  return {
    eventId: "evt-1",
    timestamp: new Date().toISOString(),
    actor: "test",
    correlationId: "corr-1",
    source: "vault",
  };
}

// =============================================================================
// Registration
// =============================================================================

describe("registration", () => {
  it("registers a schema", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event"));

    expect(catalog.has("test.event")).toBe(true);
    expect(catalog.size).toBe(1);
  });

  it("retrieves a registered schema", () => {
    const catalog = new EventCatalog();
    const schema = makeSchema("test.event", 1, "treasury");
    catalog.register(schema);

    const found = catalog.getSchema("test.event");
    expect(found).toBeDefined();
    expect(found!.type).toBe("test.event");
    expect(found!.version).toBe(1);
    expect(found!.source).toBe("treasury");
  });

  it("returns undefined for unregistered type", () => {
    const catalog = new EventCatalog();
    expect(catalog.getSchema("nope")).toBeUndefined();
  });

  it("re-registration of same version is idempotent", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 1));
    catalog.register(makeSchema("test.event", 1));

    expect(catalog.size).toBe(1);
  });

  it("version upgrade replaces schema", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 1));
    catalog.register(makeSchema("test.event", 2));

    expect(catalog.getSchema("test.event")!.version).toBe(2);
    expect(catalog.size).toBe(1);
  });
});

// =============================================================================
// Listing & Querying
// =============================================================================

describe("listing", () => {
  it("lists all registered types sorted", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("c.event"));
    catalog.register(makeSchema("a.event"));
    catalog.register(makeSchema("b.event"));

    expect(catalog.listTypes()).toEqual(["a.event", "b.event", "c.event"]);
  });

  it("lists schemas", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("a.event"));
    catalog.register(makeSchema("b.event"));

    const schemas = catalog.listSchemas();
    expect(schemas).toHaveLength(2);
  });

  it("lists by source", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("vault.a", 1, "vault"));
    catalog.register(makeSchema("treasury.a", 1, "treasury"));
    catalog.register(makeSchema("vault.b", 1, "vault"));

    const vaultEvents = catalog.listBySource("vault");
    expect(vaultEvents).toHaveLength(2);
    expect(vaultEvents.map((s) => s.type)).toContain("vault.a");
    expect(vaultEvents.map((s) => s.type)).toContain("vault.b");
  });
});

// =============================================================================
// Validation
// =============================================================================

describe("validation", () => {
  it("validates a correct payload", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event"));

    expect(catalog.validate("test.event", { id: "123" })).toBe(true);
  });

  it("rejects an invalid payload", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event"));

    expect(catalog.validate("test.event", { name: "wrong" })).toBe(false);
  });

  it("returns false for unregistered type", () => {
    const catalog = new EventCatalog();

    expect(catalog.validate("unknown", { id: "123" })).toBe(false);
  });

  it("rejects null payload", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event"));

    expect(catalog.validate("test.event", null)).toBe(false);
  });
});

// =============================================================================
// Migration
// =============================================================================

describe("migration", () => {
  it("returns payload as-is when already at current version", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 2));

    const payload = { id: "123", name: "test" };
    const migrated = catalog.migrate("test.event", payload, 2);

    expect(migrated).toBe(payload); // Same reference
  });

  it("applies single migration v1 → v2", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 2));
    catalog.registerMigration("test.event", 1, (payload) => ({
      ...payload,
      addedInV2: "default-value",
    }));

    const migrated = catalog.migrate("test.event", { id: "123" }, 1);

    expect(migrated).toEqual({ id: "123", addedInV2: "default-value" });
  });

  it("applies chained migrations v1 → v2 → v3", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 3));

    catalog.registerMigration("test.event", 1, (p) => ({
      ...p,
      fieldV2: "from-v1",
    }));
    catalog.registerMigration("test.event", 2, (p) => ({
      ...p,
      fieldV3: "from-v2",
    }));

    const migrated = catalog.migrate("test.event", { id: "123" }, 1);

    expect(migrated).toEqual({
      id: "123",
      fieldV2: "from-v1",
      fieldV3: "from-v2",
    });
  });

  it("throws on missing migration in chain", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 3));
    // Only register v1→v2, missing v2→v3
    catalog.registerMigration("test.event", 1, (p) => ({ ...p, v2: true }));

    expect(() => catalog.migrate("test.event", { id: "123" }, 1)).toThrow(
      "Missing migration",
    );
  });

  it("returns payload as-is for unknown event type (forward compatibility)", () => {
    const catalog = new EventCatalog();
    const payload = { custom: "data" };

    const migrated = catalog.migrate("unknown.event", payload, 1);

    expect(migrated).toBe(payload);
  });

  it("returns payload as-is for future version (forward compatibility)", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 2));

    const payload = { id: "123", futureField: "from-v5" };
    const migrated = catalog.migrate("test.event", payload, 5);

    expect(migrated).toBe(payload);
  });

  it("throws when registering migration for unknown type", () => {
    const catalog = new EventCatalog();

    expect(() =>
      catalog.registerMigration("unknown", 1, (p) => p),
    ).toThrow(CatalogError);
  });
});

// =============================================================================
// Upcast
// =============================================================================

describe("upcast", () => {
  it("upcasts a stored event to current version", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 2));
    catalog.registerMigration("test.event", 1, (p) => ({
      ...p,
      newField: "migrated",
    }));

    const event: DomainEvent = {
      type: "test.event",
      metadata: makeMetadata(),
      payload: { id: "123" },
    };

    const upcasted = catalog.upcast(event, 1);

    expect(upcasted.type).toBe("test.event");
    expect(upcasted.metadata).toBe(event.metadata); // Same reference
    expect(upcasted.payload).toEqual({ id: "123", newField: "migrated" });
  });

  it("returns same event if already at current version", () => {
    const catalog = new EventCatalog();
    catalog.register(makeSchema("test.event", 1));

    const event: DomainEvent = {
      type: "test.event",
      metadata: makeMetadata(),
      payload: { id: "123" },
    };

    const upcasted = catalog.upcast(event, 1);
    expect(upcasted).toBe(event); // Same reference
  });
});

// =============================================================================
// Versioned Event Helpers
// =============================================================================

describe("versioned event helpers", () => {
  it("creates a versioned event with _schemaVersion", () => {
    const event = createVersionedEvent(
      "test.event",
      makeMetadata(),
      { id: "123" },
      2,
    );

    expect(event.type).toBe("test.event");
    expect(event.payload).toEqual({ id: "123", _schemaVersion: 2 });
  });

  it("extracts schema version from event", () => {
    const event = createVersionedEvent(
      "test.event",
      makeMetadata(),
      { id: "123" },
      3,
    );

    expect(getSchemaVersion(event)).toBe(3);
  });

  it("returns 1 for events without _schemaVersion", () => {
    const event: DomainEvent = {
      type: "test.event",
      metadata: makeMetadata(),
      payload: { id: "123" },
    };

    expect(getSchemaVersion(event)).toBe(1);
  });

  it("returns 1 for non-integer _schemaVersion", () => {
    const event: DomainEvent = {
      type: "test.event",
      metadata: makeMetadata(),
      payload: { id: "123", _schemaVersion: "not-a-number" },
    };

    expect(getSchemaVersion(event)).toBe(1);
  });

  it("returns 1 for zero _schemaVersion", () => {
    const event: DomainEvent = {
      type: "test.event",
      metadata: makeMetadata(),
      payload: { _schemaVersion: 0 },
    };

    expect(getSchemaVersion(event)).toBe(1);
  });
});

// =============================================================================
// Attestia Catalog
// =============================================================================

describe("createAtlestiaCatalog", () => {
  it("creates a catalog with all 20 event types", () => {
    const catalog = createAtlestiaCatalog();

    expect(catalog.size).toBe(20);
  });

  it("all ATTESTIA_EVENTS constants are registered", () => {
    const catalog = createAtlestiaCatalog();

    for (const eventType of Object.values(ATTESTIA_EVENTS)) {
      expect(catalog.has(eventType)).toBe(true);
    }
  });

  it("vault events are registered with source=vault", () => {
    const catalog = createAtlestiaCatalog();
    const vaultEvents = catalog.listBySource("vault");

    expect(vaultEvents.length).toBeGreaterThan(0);
    for (const schema of vaultEvents) {
      expect(schema.type.startsWith("vault.")).toBe(true);
    }
  });

  it("validates intent.declared payload", () => {
    const catalog = createAtlestiaCatalog();

    expect(
      catalog.validate(ATTESTIA_EVENTS.INTENT_DECLARED, {
        intentId: "int-1",
        kind: "transfer",
        description: "Transfer 100 USDC",
        declaredBy: "alice",
        params: {},
      }),
    ).toBe(true);
  });

  it("rejects invalid intent.declared payload", () => {
    const catalog = createAtlestiaCatalog();

    expect(
      catalog.validate(ATTESTIA_EVENTS.INTENT_DECLARED, {
        wrongField: "value",
      }),
    ).toBe(false);
  });

  it("validates state.registered payload", () => {
    const catalog = createAtlestiaCatalog();

    expect(
      catalog.validate(ATTESTIA_EVENTS.STATE_REGISTERED, {
        stateId: "s1",
        parentId: null,
        orderIndex: 0,
      }),
    ).toBe(true);
  });

  it("validates chain event detected payload", () => {
    const catalog = createAtlestiaCatalog();

    expect(
      catalog.validate(ATTESTIA_EVENTS.CHAIN_EVENT_DETECTED, {
        chainId: "evm:1",
        txHash: "0x123",
        blockNumber: 12345,
        eventType: "Transfer",
      }),
    ).toBe(true);
  });

  it("event types follow naming convention", () => {
    const catalog = createAtlestiaCatalog();

    for (const eventType of catalog.listTypes()) {
      // Format: subsystem.entity.action
      const parts = eventType.split(".");
      expect(parts.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("all schemas are at version 1", () => {
    const catalog = createAtlestiaCatalog();

    for (const schema of catalog.listSchemas()) {
      expect(schema.version).toBe(1);
    }
  });
});
