/**
 * @attestia/event-store — In-memory EventStore implementation.
 *
 * Stores events in plain arrays. Suitable for:
 * - Unit and integration tests
 * - Short-lived processes
 * - Development and prototyping
 *
 * Not suitable for production (all state lost on process exit).
 *
 * Properties:
 * - O(1) append (amortized)
 * - O(n) read (where n = number of events returned)
 * - Synchronous subscription dispatch
 * - No durability guarantees
 */

import type { DomainEvent } from "@attestia/types";
import type {
  AppendOptions,
  AppendResult,
  EventHandler,
  EventStore,
  EventStoreIntegrityResult,
  ReadAllOptions,
  ReadOptions,
  StoredEvent,
  Subscription,
} from "./types.js";
import { EventStoreError } from "./types.js";
import { computeEventHash, GENESIS_HASH, verifyHashChain } from "./hash-chain.js";

/**
 * In-memory event store.
 *
 * All events are stored in two data structures:
 * - Per-stream arrays (indexed by streamId) for stream reads
 * - Global array for readAll and global subscriptions
 *
 * Subscriptions are dispatched synchronously on append.
 */
export class InMemoryEventStore implements EventStore {
  /** Per-stream event storage */
  private readonly _streams = new Map<string, StoredEvent[]>();

  /** Global event log (all streams, in append order) */
  private readonly _globalLog: StoredEvent[] = [];

  /** Per-stream subscribers */
  private readonly _streamSubscribers = new Map<
    string,
    Set<EventHandler>
  >();

  /** Global subscribers (all streams) */
  private readonly _globalSubscribers = new Set<EventHandler>();

  /** Next global position to assign */
  private _nextGlobalPosition = 1;

  /** Hash of the last appended event (for chain linking) */
  private _lastHash: string = GENESIS_HASH;

  // ─── Append ─────────────────────────────────────────────────────────

  append(
    streamId: string,
    events: readonly DomainEvent[],
    options?: AppendOptions,
  ): AppendResult {
    // Validate inputs
    this._validateStreamId(streamId);

    if (events.length === 0) {
      throw new EventStoreError(
        "EMPTY_APPEND",
        "Cannot append zero events",
        streamId,
      );
    }

    // Get or create stream
    let stream = this._streams.get(streamId);
    const currentVersion = stream !== undefined ? stream.length : 0;

    // Concurrency check
    const expectedVersion = options?.expectedVersion;
    if (expectedVersion !== undefined && expectedVersion !== "any") {
      if (expectedVersion === "no_stream") {
        if (currentVersion !== 0) {
          throw new EventStoreError(
            "CONCURRENCY_CONFLICT",
            `Stream "${streamId}" already exists (version ${currentVersion}), expected no_stream`,
            streamId,
          );
        }
      } else {
        if (currentVersion !== expectedVersion) {
          throw new EventStoreError(
            "CONCURRENCY_CONFLICT",
            `Stream "${streamId}" is at version ${currentVersion}, expected ${expectedVersion}`,
            streamId,
          );
        }
      }
    }

    // Create stream if needed
    if (stream === undefined) {
      stream = [];
      this._streams.set(streamId, stream);
    }

    // Append events
    const fromVersion = currentVersion + 1;
    const storedEvents: StoredEvent[] = [];
    const appendedAt = new Date().toISOString();

    for (let i = 0; i < events.length; i++) {
      const event = events[i]!;
      const version = fromVersion + i;
      const globalPosition = this._nextGlobalPosition++;

      const base: StoredEvent = {
        event: {
          type: event.type,
          metadata: event.metadata,
          payload: event.payload,
        },
        streamId,
        version,
        globalPosition,
        appendedAt,
      };

      const previousHash = this._lastHash;
      const hash = computeEventHash(base, previousHash);

      const stored = Object.assign(base, { hash, previousHash }) as StoredEvent;
      this._lastHash = hash;

      stream.push(stored);
      this._globalLog.push(stored);
      storedEvents.push(stored);
    }

    // Dispatch to subscribers
    this._dispatch(streamId, storedEvents);

    return {
      streamId,
      fromVersion,
      toVersion: fromVersion + events.length - 1,
      count: events.length,
    };
  }

  // ─── Read ───────────────────────────────────────────────────────────

  read(streamId: string, options?: ReadOptions): readonly StoredEvent[] {
    this._validateStreamId(streamId);

    const stream = this._streams.get(streamId);
    if (stream === undefined) {
      return [];
    }

    const direction = options?.direction ?? "forward";
    const fromVersion = options?.fromVersion ?? 1;
    const maxCount = options?.maxCount;

    if (fromVersion < 1) {
      throw new EventStoreError(
        "INVALID_VERSION",
        `fromVersion must be >= 1, got ${fromVersion}`,
        streamId,
      );
    }

    let result: StoredEvent[];

    if (direction === "forward") {
      // Filter events from fromVersion onward
      result = stream.filter((e) => e.version >= fromVersion);
    } else {
      // Backward: filter and reverse
      result = stream.filter((e) => e.version <= fromVersion).reverse();
    }

    if (maxCount !== undefined && maxCount >= 0) {
      result = result.slice(0, maxCount);
    }

    return result;
  }

  readAll(options?: ReadAllOptions): readonly StoredEvent[] {
    const direction = options?.direction ?? "forward";
    const fromPosition = options?.fromPosition ?? 1;
    const maxCount = options?.maxCount;

    let result: StoredEvent[];

    if (direction === "forward") {
      result = this._globalLog.filter(
        (e) => e.globalPosition >= fromPosition,
      );
    } else {
      result = this._globalLog
        .filter((e) => e.globalPosition <= fromPosition)
        .reverse();
    }

    if (maxCount !== undefined && maxCount >= 0) {
      result = result.slice(0, maxCount);
    }

    return result;
  }

  // ─── Subscriptions ──────────────────────────────────────────────────

  subscribe(streamId: string, handler: EventHandler): Subscription {
    this._validateStreamId(streamId);

    let subscribers = this._streamSubscribers.get(streamId);
    if (subscribers === undefined) {
      subscribers = new Set();
      this._streamSubscribers.set(streamId, subscribers);
    }
    subscribers.add(handler);

    return {
      unsubscribe: () => {
        subscribers.delete(handler);
        if (subscribers.size === 0) {
          this._streamSubscribers.delete(streamId);
        }
      },
    };
  }

  subscribeAll(handler: EventHandler): Subscription {
    this._globalSubscribers.add(handler);

    return {
      unsubscribe: () => {
        this._globalSubscribers.delete(handler);
      },
    };
  }

  // ─── Query ──────────────────────────────────────────────────────────

  streamExists(streamId: string): boolean {
    const stream = this._streams.get(streamId);
    return stream !== undefined && stream.length > 0;
  }

  streamVersion(streamId: string): number {
    const stream = this._streams.get(streamId);
    return stream !== undefined ? stream.length : 0;
  }

  globalPosition(): number {
    return this._nextGlobalPosition - 1;
  }

  // ─── Integrity ────────────────────────────────────────────────────────

  /**
   * Verify the hash chain integrity of all events in the store.
   */
  verifyIntegrity(): EventStoreIntegrityResult {
    return verifyHashChain(this._globalLog);
  }

  // ─── Internal ───────────────────────────────────────────────────────

  private _validateStreamId(streamId: string): void {
    if (streamId.length === 0) {
      throw new EventStoreError(
        "INVALID_STREAM_ID",
        "Stream ID must be a non-empty string",
      );
    }
  }

  private _dispatch(streamId: string, events: readonly StoredEvent[]): void {
    // Stream-specific subscribers
    const streamSubs = this._streamSubscribers.get(streamId);
    if (streamSubs !== undefined) {
      for (const handler of streamSubs) {
        for (const event of events) {
          handler(event);
        }
      }
    }

    // Global subscribers
    for (const handler of this._globalSubscribers) {
      for (const event of events) {
        handler(event);
      }
    }
  }
}
