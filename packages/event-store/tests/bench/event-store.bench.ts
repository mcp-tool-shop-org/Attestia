/**
 * Event store benchmarks.
 *
 * Measures:
 * - InMemoryEventStore append throughput
 * - JsonlEventStore append throughput
 * - Read 1K events
 * - Verify 1K-event hash chain
 */

import { bench, describe } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { InMemoryEventStore } from "../../src/in-memory-store.js";
import { JsonlEventStore } from "../../src/jsonl-store.js";
import { verifyHashChain } from "../../src/hash-chain.js";
import type { DomainEvent } from "@attestia/types";

function makeEvent(i: number): DomainEvent {
  return {
    type: "bench.event",
    metadata: {
      eventId: `evt-${i}`,
      timestamp: new Date().toISOString(),
      actor: "benchmark",
      correlationId: `corr-${i}`,
      source: "vault",
    },
    payload: { index: i, data: `payload-${i}` },
  };
}

describe("InMemoryEventStore", () => {
  bench("append 100 single events", () => {
    const store = new InMemoryEventStore();
    for (let i = 0; i < 100; i++) {
      store.append(`stream-${i}`, [makeEvent(i)]);
    }
  });

  bench("append batch of 100 events", () => {
    const store = new InMemoryEventStore();
    const events = Array.from({ length: 100 }, (_, i) => makeEvent(i));
    store.append("stream-batch", events);
  });

  let readStore: InMemoryEventStore;
  bench(
    "read 1K events from stream",
    () => {
      readStore.read("stream-read");
    },
    {
      setup() {
        readStore = new InMemoryEventStore();
        const events = Array.from({ length: 1000 }, (_, i) => makeEvent(i));
        readStore.append("stream-read", events);
      },
    },
  );
});

describe("JsonlEventStore", () => {
  let tempDir: string;

  bench(
    "append single event",
    () => {
      const store = new JsonlEventStore({
        filePath: join(tempDir, "single.jsonl"),
      });
      for (let i = 0; i < 100; i++) {
        store.append(`stream-${i}`, [makeEvent(i)]);
      }
    },
    {
      setup() {
        tempDir = mkdtempSync(join(tmpdir(), "bench-jsonl-"));
      },
      teardown() {
        rmSync(tempDir, { recursive: true, force: true });
      },
    },
  );

  bench(
    "append batch of 100 events",
    () => {
      const store = new JsonlEventStore({
        filePath: join(tempDir, "batch.jsonl"),
      });
      const events = Array.from({ length: 100 }, (_, i) => makeEvent(i));
      store.append("stream-batch", events);
    },
    {
      setup() {
        tempDir = mkdtempSync(join(tmpdir(), "bench-jsonl-batch-"));
      },
      teardown() {
        rmSync(tempDir, { recursive: true, force: true });
      },
    },
  );
});

describe("hash chain verification", () => {
  let events1K: ReturnType<InMemoryEventStore["readAll"]>;
  let events100: ReturnType<InMemoryEventStore["readAll"]>;

  bench(
    "verify 1K-event chain",
    () => {
      verifyHashChain(events1K);
    },
    {
      setup() {
        const store = new InMemoryEventStore();
        const evts = Array.from({ length: 1000 }, (_, i) => makeEvent(i));
        store.append("chain-stream", evts);
        events1K = store.readAll();
      },
    },
  );

  bench(
    "verify 100-event chain",
    () => {
      verifyHashChain(events100);
    },
    {
      setup() {
        const store = new InMemoryEventStore();
        const evts = Array.from({ length: 100 }, (_, i) => makeEvent(i));
        store.append("chain-stream", evts);
        events100 = store.readAll();
      },
    },
  );
});
