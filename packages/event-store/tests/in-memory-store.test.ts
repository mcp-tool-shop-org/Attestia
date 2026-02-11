/**
 * Tests for InMemoryEventStore.
 *
 * Verifies:
 * - Append: single event, batch, ordering, global position
 * - Concurrency: expected version, no_stream, any
 * - Read: forward, backward, from version, max count
 * - ReadAll: global ordering, from position, max count
 * - Subscriptions: stream-specific, global, unsubscribe
 * - Query: stream existence, version, global position
 * - Errors: empty append, invalid stream ID, concurrency conflicts
 */

import { describe, it, expect, vi } from "vitest";
import type { DomainEvent } from "@attestia/types";
import { InMemoryEventStore } from "../src/in-memory-store.js";
import { EventStoreError } from "../src/types.js";

// =============================================================================
// Helpers
// =============================================================================

function makeEvent(type: string, correlationId?: string): DomainEvent {
  return {
    type,
    metadata: {
      eventId: `evt-${type}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      actor: "test",
      correlationId: correlationId ?? `corr-${Math.random().toString(36).slice(2, 8)}`,
      source: "vault",
    },
    payload: { type },
  };
}

function makeEvents(count: number, prefix = "event"): DomainEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeEvent(`${prefix}.${i + 1}`),
  );
}

// =============================================================================
// Append
// =============================================================================

describe("append", () => {
  it("appends a single event to a new stream", () => {
    const store = new InMemoryEventStore();
    const event = makeEvent("test.created");

    const result = store.append("stream-1", [event]);

    expect(result.streamId).toBe("stream-1");
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(1);
    expect(result.count).toBe(1);
  });

  it("appends multiple events atomically", () => {
    const store = new InMemoryEventStore();
    const events = makeEvents(3);

    const result = store.append("stream-1", events);

    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(3);
    expect(result.count).toBe(3);
  });

  it("assigns monotonically increasing versions within a stream", () => {
    const store = new InMemoryEventStore();

    store.append("stream-1", makeEvents(2));
    store.append("stream-1", makeEvents(3));

    const all = store.read("stream-1");
    expect(all).toHaveLength(5);
    expect(all.map((e) => e.version)).toEqual([1, 2, 3, 4, 5]);
  });

  it("assigns monotonically increasing global positions", () => {
    const store = new InMemoryEventStore();

    store.append("stream-1", makeEvents(2));
    store.append("stream-2", makeEvents(2));
    store.append("stream-1", [makeEvent("late")]);

    const all = store.readAll();
    expect(all).toHaveLength(5);
    expect(all.map((e) => e.globalPosition)).toEqual([1, 2, 3, 4, 5]);
  });

  it("stores the event data correctly", () => {
    const store = new InMemoryEventStore();
    const event = makeEvent("intent.declared");

    store.append("stream-1", [event]);
    const [stored] = store.read("stream-1");

    expect(stored!.event.type).toBe("intent.declared");
    expect(stored!.event.metadata.actor).toBe("test");
    expect(stored!.event.payload).toEqual({ type: "intent.declared" });
    expect(stored!.streamId).toBe("stream-1");
    expect(stored!.version).toBe(1);
    expect(stored!.globalPosition).toBe(1);
    expect(stored!.appendedAt).toBeTruthy();
  });

  it("maintains independent version sequences per stream", () => {
    const store = new InMemoryEventStore();

    store.append("stream-a", makeEvents(3));
    store.append("stream-b", makeEvents(2));

    expect(store.streamVersion("stream-a")).toBe(3);
    expect(store.streamVersion("stream-b")).toBe(2);

    const streamA = store.read("stream-a");
    const streamB = store.read("stream-b");

    expect(streamA.map((e) => e.version)).toEqual([1, 2, 3]);
    expect(streamB.map((e) => e.version)).toEqual([1, 2]);
  });

  it("rejects append with empty events array", () => {
    const store = new InMemoryEventStore();

    expect(() => store.append("stream-1", [])).toThrow(EventStoreError);
    expect(() => store.append("stream-1", [])).toThrow("Cannot append zero events");
  });

  it("rejects append with empty stream ID", () => {
    const store = new InMemoryEventStore();

    expect(() => store.append("", [makeEvent("test")])).toThrow(EventStoreError);
    expect(() => store.append("", [makeEvent("test")])).toThrow("non-empty string");
  });
});

// =============================================================================
// Concurrency Control
// =============================================================================

describe("concurrency control", () => {
  it("succeeds with correct expectedVersion", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(3));

    const result = store.append("stream-1", [makeEvent("next")], {
      expectedVersion: 3,
    });

    expect(result.fromVersion).toBe(4);
  });

  it("fails with wrong expectedVersion", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(3));

    expect(() =>
      store.append("stream-1", [makeEvent("next")], {
        expectedVersion: 2,
      }),
    ).toThrow("at version 3, expected 2");
  });

  it("succeeds with no_stream on new stream", () => {
    const store = new InMemoryEventStore();

    const result = store.append("new-stream", [makeEvent("first")], {
      expectedVersion: "no_stream",
    });

    expect(result.fromVersion).toBe(1);
  });

  it("fails with no_stream on existing stream", () => {
    const store = new InMemoryEventStore();
    store.append("existing", [makeEvent("first")]);

    expect(() =>
      store.append("existing", [makeEvent("second")], {
        expectedVersion: "no_stream",
      }),
    ).toThrow("already exists");
  });

  it("succeeds with 'any' regardless of version", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(5));

    const result = store.append("stream-1", [makeEvent("any-version")], {
      expectedVersion: "any",
    });

    expect(result.fromVersion).toBe(6);
  });

  it("succeeds with 'any' on new stream", () => {
    const store = new InMemoryEventStore();

    const result = store.append("new-stream", [makeEvent("first")], {
      expectedVersion: "any",
    });

    expect(result.fromVersion).toBe(1);
  });

  it("concurrency error includes stream ID and code", () => {
    const store = new InMemoryEventStore();
    store.append("my-stream", [makeEvent("first")]);

    try {
      store.append("my-stream", [makeEvent("second")], {
        expectedVersion: 0,
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EventStoreError);
      const storeErr = err as EventStoreError;
      expect(storeErr.code).toBe("CONCURRENCY_CONFLICT");
      expect(storeErr.streamId).toBe("my-stream");
    }
  });
});

// =============================================================================
// Read
// =============================================================================

describe("read", () => {
  it("reads all events from a stream (forward)", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(5, "evt"));

    const events = store.read("stream-1");

    expect(events).toHaveLength(5);
    expect(events[0]!.version).toBe(1);
    expect(events[4]!.version).toBe(5);
  });

  it("returns empty array for non-existent stream", () => {
    const store = new InMemoryEventStore();

    const events = store.read("does-not-exist");

    expect(events).toEqual([]);
  });

  it("reads from a specific version", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(5));

    const events = store.read("stream-1", { fromVersion: 3 });

    expect(events).toHaveLength(3);
    expect(events[0]!.version).toBe(3);
    expect(events[2]!.version).toBe(5);
  });

  it("reads with maxCount limit", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(10));

    const events = store.read("stream-1", { maxCount: 3 });

    expect(events).toHaveLength(3);
    expect(events[0]!.version).toBe(1);
    expect(events[2]!.version).toBe(3);
  });

  it("reads backward from a specific version", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(5));

    const events = store.read("stream-1", {
      fromVersion: 4,
      direction: "backward",
    });

    expect(events).toHaveLength(4);
    expect(events[0]!.version).toBe(4);
    expect(events[3]!.version).toBe(1);
  });

  it("reads backward with maxCount", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(5));

    const events = store.read("stream-1", {
      fromVersion: 5,
      direction: "backward",
      maxCount: 2,
    });

    expect(events).toHaveLength(2);
    expect(events[0]!.version).toBe(5);
    expect(events[1]!.version).toBe(4);
  });

  it("rejects negative fromVersion", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", [makeEvent("test")]);

    expect(() => store.read("stream-1", { fromVersion: 0 })).toThrow(
      "fromVersion must be >= 1",
    );
  });
});

// =============================================================================
// ReadAll
// =============================================================================

describe("readAll", () => {
  it("reads all events across streams in global order", () => {
    const store = new InMemoryEventStore();
    store.append("stream-a", [makeEvent("a1")]);
    store.append("stream-b", [makeEvent("b1")]);
    store.append("stream-a", [makeEvent("a2")]);

    const all = store.readAll();

    expect(all).toHaveLength(3);
    expect(all[0]!.streamId).toBe("stream-a");
    expect(all[0]!.event.type).toBe("a1");
    expect(all[1]!.streamId).toBe("stream-b");
    expect(all[2]!.streamId).toBe("stream-a");
    expect(all[2]!.event.type).toBe("a2");
  });

  it("reads from a specific global position", () => {
    const store = new InMemoryEventStore();
    store.append("stream-a", makeEvents(3, "a"));
    store.append("stream-b", makeEvents(2, "b"));

    const events = store.readAll({ fromPosition: 4 });

    expect(events).toHaveLength(2);
    expect(events[0]!.globalPosition).toBe(4);
    expect(events[1]!.globalPosition).toBe(5);
  });

  it("reads all backward", () => {
    const store = new InMemoryEventStore();
    store.append("stream-a", makeEvents(2, "a"));
    store.append("stream-b", makeEvents(2, "b"));

    const events = store.readAll({
      fromPosition: 4,
      direction: "backward",
    });

    expect(events).toHaveLength(4);
    expect(events[0]!.globalPosition).toBe(4);
    expect(events[3]!.globalPosition).toBe(1);
  });

  it("readAll with maxCount", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(10));

    const events = store.readAll({ maxCount: 3 });

    expect(events).toHaveLength(3);
    expect(events[0]!.globalPosition).toBe(1);
    expect(events[2]!.globalPosition).toBe(3);
  });

  it("returns empty array for empty store", () => {
    const store = new InMemoryEventStore();

    const events = store.readAll();

    expect(events).toEqual([]);
  });
});

// =============================================================================
// Subscriptions
// =============================================================================

describe("subscriptions", () => {
  it("stream subscription receives events for that stream", () => {
    const store = new InMemoryEventStore();
    const received: string[] = [];

    store.subscribe("stream-1", (event) => {
      received.push(event.event.type);
    });

    store.append("stream-1", [makeEvent("first")]);
    store.append("stream-1", [makeEvent("second")]);

    expect(received).toEqual(["first", "second"]);
  });

  it("stream subscription ignores events from other streams", () => {
    const store = new InMemoryEventStore();
    const received: string[] = [];

    store.subscribe("stream-1", (event) => {
      received.push(event.event.type);
    });

    store.append("stream-1", [makeEvent("mine")]);
    store.append("stream-2", [makeEvent("not-mine")]);

    expect(received).toEqual(["mine"]);
  });

  it("global subscription receives events from all streams", () => {
    const store = new InMemoryEventStore();
    const received: string[] = [];

    store.subscribeAll((event) => {
      received.push(`${event.streamId}:${event.event.type}`);
    });

    store.append("stream-1", [makeEvent("a")]);
    store.append("stream-2", [makeEvent("b")]);

    expect(received).toEqual(["stream-1:a", "stream-2:b"]);
  });

  it("unsubscribe stops receiving events", () => {
    const store = new InMemoryEventStore();
    const received: string[] = [];

    const sub = store.subscribe("stream-1", (event) => {
      received.push(event.event.type);
    });

    store.append("stream-1", [makeEvent("before")]);
    sub.unsubscribe();
    store.append("stream-1", [makeEvent("after")]);

    expect(received).toEqual(["before"]);
  });

  it("global unsubscribe stops receiving events", () => {
    const store = new InMemoryEventStore();
    const received: string[] = [];

    const sub = store.subscribeAll((event) => {
      received.push(event.event.type);
    });

    store.append("stream-1", [makeEvent("before")]);
    sub.unsubscribe();
    store.append("stream-1", [makeEvent("after")]);

    expect(received).toEqual(["before"]);
  });

  it("multiple subscribers on the same stream", () => {
    const store = new InMemoryEventStore();
    const received1: string[] = [];
    const received2: string[] = [];

    store.subscribe("stream-1", (event) => received1.push(event.event.type));
    store.subscribe("stream-1", (event) => received2.push(event.event.type));

    store.append("stream-1", [makeEvent("shared")]);

    expect(received1).toEqual(["shared"]);
    expect(received2).toEqual(["shared"]);
  });

  it("batch append dispatches events in order", () => {
    const store = new InMemoryEventStore();
    const received: number[] = [];

    store.subscribe("stream-1", (event) => {
      received.push(event.version);
    });

    store.append("stream-1", makeEvents(5));

    expect(received).toEqual([1, 2, 3, 4, 5]);
  });
});

// =============================================================================
// Query
// =============================================================================

describe("query", () => {
  it("streamExists returns false for non-existent stream", () => {
    const store = new InMemoryEventStore();

    expect(store.streamExists("nope")).toBe(false);
  });

  it("streamExists returns true after append", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", [makeEvent("test")]);

    expect(store.streamExists("stream-1")).toBe(true);
  });

  it("streamVersion returns 0 for non-existent stream", () => {
    const store = new InMemoryEventStore();

    expect(store.streamVersion("nope")).toBe(0);
  });

  it("streamVersion returns current version", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(3));

    expect(store.streamVersion("stream-1")).toBe(3);
  });

  it("streamVersion updates after additional appends", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(2));
    store.append("stream-1", makeEvents(3));

    expect(store.streamVersion("stream-1")).toBe(5);
  });

  it("globalPosition returns 0 for empty store", () => {
    const store = new InMemoryEventStore();

    expect(store.globalPosition()).toBe(0);
  });

  it("globalPosition tracks across all streams", () => {
    const store = new InMemoryEventStore();
    store.append("stream-1", makeEvents(3));
    store.append("stream-2", makeEvents(2));

    expect(store.globalPosition()).toBe(5);
  });
});
