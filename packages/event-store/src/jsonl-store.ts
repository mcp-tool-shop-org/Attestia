/**
 * @attestia/event-store — File-based JSONL EventStore implementation.
 *
 * Stores events as one JSON object per line in a `.jsonl` file.
 *
 * Crash safety:
 * - Each append flushes to disk via fsync before returning
 * - Partial writes (torn pages) are detected and skipped on load
 * - The file is the source of truth; in-memory state is derived
 *
 * Properties:
 * - Durable: events survive process restart
 * - Append-only: file is never truncated or rewritten
 * - O(1) append (single write + fsync)
 * - O(n) load on startup (sequential read of all lines)
 * - Synchronous subscription dispatch
 *
 * File format:
 * Each line is a JSON object with the StoredEvent shape:
 * {"event":{...},"streamId":"...","version":1,"globalPosition":1,"appendedAt":"..."}
 */

import {
  openSync,
  closeSync,
  appendFileSync,
  readFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
} from "node:fs";
import { dirname } from "node:path";
import type { DomainEvent } from "@attestia/types";
import type {
  AppendOptions,
  AppendResult,
  EventHandler,
  EventStore,
  ReadAllOptions,
  ReadOptions,
  StoredEvent,
  Subscription,
} from "./types.js";
import { EventStoreError } from "./types.js";

/**
 * Options for creating a JsonlEventStore.
 */
export interface JsonlEventStoreOptions {
  /** Path to the JSONL file */
  readonly filePath: string;
}

/**
 * Serialized form of a StoredEvent in the JSONL file.
 * Same shape as StoredEvent — validated on load.
 */
interface JsonlRecord {
  event: {
    type: string;
    metadata: Record<string, unknown>;
    payload: Record<string, unknown>;
  };
  streamId: string;
  version: number;
  globalPosition: number;
  appendedAt: string;
}

/**
 * File-based JSONL event store.
 *
 * Events are persisted as newline-delimited JSON objects.
 * The in-memory index is rebuilt from the file on construction.
 */
export class JsonlEventStore implements EventStore {
  private readonly _filePath: string;

  /** Per-stream event storage (rebuilt from file on load) */
  private readonly _streams = new Map<string, StoredEvent[]>();

  /** Global event log (rebuilt from file on load) */
  private readonly _globalLog: StoredEvent[] = [];

  /** Per-stream subscribers */
  private readonly _streamSubscribers = new Map<
    string,
    Set<EventHandler>
  >();

  /** Global subscribers */
  private readonly _globalSubscribers = new Set<EventHandler>();

  /** Next global position */
  private _nextGlobalPosition = 1;

  /**
   * Create a new JsonlEventStore.
   *
   * If the file exists, events are loaded from it.
   * If the file does not exist, it will be created on first append.
   * The parent directory is created if it doesn't exist.
   */
  constructor(options: JsonlEventStoreOptions) {
    this._filePath = options.filePath;

    // Ensure parent directory exists
    const dir = dirname(this._filePath);
    mkdirSync(dir, { recursive: true });

    // Load existing events from file
    this._loadFromFile();
  }

  // ─── Append ─────────────────────────────────────────────────────────

  append(
    streamId: string,
    events: readonly DomainEvent[],
    options?: AppendOptions,
  ): AppendResult {
    this._validateStreamId(streamId);

    if (events.length === 0) {
      throw new EventStoreError(
        "EMPTY_APPEND",
        "Cannot append zero events",
        streamId,
      );
    }

    // Get current stream state
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

    // Build stored events
    const fromVersion = currentVersion + 1;
    const storedEvents: StoredEvent[] = [];
    const appendedAt = new Date().toISOString();
    let lines = "";

    for (let i = 0; i < events.length; i++) {
      const event = events[i]!;
      const version = fromVersion + i;
      const globalPosition = this._nextGlobalPosition++;

      const stored: StoredEvent = {
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

      storedEvents.push(stored);
      lines += JSON.stringify(stored) + "\n";
    }

    // Write to file atomically (all lines in one write + fsync)
    this._writeAndSync(lines);

    // Update in-memory state only after successful write
    for (const stored of storedEvents) {
      stream.push(stored);
      this._globalLog.push(stored);
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
      result = stream.filter((e) => e.version >= fromVersion);
    } else {
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

  // ─── File Path ──────────────────────────────────────────────────────

  /**
   * Get the file path this store writes to.
   * Useful for testing and debugging.
   */
  get filePath(): string {
    return this._filePath;
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

  /**
   * Load events from the JSONL file into memory.
   *
   * Tolerates partial/corrupt lines at the end of the file
   * (which can happen on unclean shutdown).
   */
  private _loadFromFile(): void {
    if (!existsSync(this._filePath)) {
      return;
    }

    const content = readFileSync(this._filePath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        continue;
      }

      let record: JsonlRecord;
      try {
        record = JSON.parse(trimmed) as JsonlRecord;
      } catch {
        // Corrupt/partial line — skip (crash safety)
        continue;
      }

      // Validate minimum required fields
      if (
        typeof record.streamId !== "string" ||
        typeof record.version !== "number" ||
        typeof record.globalPosition !== "number" ||
        record.event === undefined
      ) {
        continue;
      }

      const stored: StoredEvent = {
        event: {
          type: record.event.type,
          metadata: record.event.metadata as unknown as StoredEvent["event"]["metadata"],
          payload: record.event.payload,
        },
        streamId: record.streamId,
        version: record.version,
        globalPosition: record.globalPosition,
        appendedAt: record.appendedAt,
      };

      // Add to stream index
      let stream = this._streams.get(stored.streamId);
      if (stream === undefined) {
        stream = [];
        this._streams.set(stored.streamId, stream);
      }
      stream.push(stored);

      // Add to global log
      this._globalLog.push(stored);

      // Track next global position
      if (stored.globalPosition >= this._nextGlobalPosition) {
        this._nextGlobalPosition = stored.globalPosition + 1;
      }
    }
  }

  /**
   * Write data to the JSONL file and fsync for durability.
   */
  private _writeAndSync(data: string): void {
    const fd = openSync(this._filePath, "a");
    try {
      appendFileSync(fd, data, "utf-8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }

  private _dispatch(streamId: string, events: readonly StoredEvent[]): void {
    const streamSubs = this._streamSubscribers.get(streamId);
    if (streamSubs !== undefined) {
      for (const handler of streamSubs) {
        for (const event of events) {
          handler(event);
        }
      }
    }

    for (const handler of this._globalSubscribers) {
      for (const event of events) {
        handler(event);
      }
    }
  }
}
