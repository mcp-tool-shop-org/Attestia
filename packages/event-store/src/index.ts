/**
 * @attestia/event-store — Append-only event persistence.
 *
 * Provides:
 * - EventStore interface for append-only event streams
 * - InMemoryEventStore for tests and development
 * - JsonlEventStore for durable file-based persistence
 *
 * @packageDocumentation
 */

// Core types
export type {
  StoredEvent,
  ExpectedVersion,
  AppendOptions,
  AppendResult,
  ReadDirection,
  ReadOptions,
  ReadAllOptions,
  EventHandler,
  Subscription,
  EventStore,
  EventStoreErrorCode,
} from "./types.js";
export { EventStoreError } from "./types.js";

// Implementations
export { InMemoryEventStore } from "./in-memory-store.js";
export { JsonlEventStore } from "./jsonl-store.js";
export type { JsonlEventStoreOptions } from "./jsonl-store.js";
