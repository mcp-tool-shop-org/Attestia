/**
 * @attestia/event-store — Snapshot Store.
 *
 * Provides interfaces and implementations for snapshot persistence.
 *
 * Snapshots are point-in-time captures of aggregate state.
 * Combined with event sourcing, they enable efficient startup:
 * 1. Load latest snapshot (if any)
 * 2. Replay only events after the snapshot version
 * 3. State is fully reconstructed
 *
 * Design principles:
 * - Snapshots are supplementary — the event log is the source of truth
 * - Snapshots can be deleted without data loss (just slower startup)
 * - Each snapshot tracks which event version it was taken at
 * - Multiple snapshots per stream are allowed (old ones can be pruned)
 * - Each snapshot includes a stateHash for integrity verification
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";

// =============================================================================
// Types
// =============================================================================

/**
 * Compute a SHA-256 hash of the canonical JSON representation of a state.
 */
export function computeSnapshotHash(state: unknown): string {
  const canonical = canonicalize(state);
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * A stored snapshot with metadata.
 */
export interface StoredSnapshot<TState = unknown> {
  /** The stream this snapshot belongs to */
  readonly streamId: string;

  /** The event version this snapshot was taken at */
  readonly version: number;

  /** The serialized aggregate state */
  readonly state: TState;

  /** When this snapshot was taken */
  readonly createdAt: string;

  /** SHA-256 hash of the canonical state (for integrity verification) */
  readonly stateHash: string;
}

/**
 * Options for saving a snapshot.
 */
export interface SaveSnapshotOptions {
  /** The stream this snapshot belongs to */
  readonly streamId: string;

  /** The event version this snapshot was taken at */
  readonly version: number;

  /** The aggregate state to snapshot */
  readonly state: unknown;
}

/**
 * Verify that a snapshot's stateHash matches its state.
 *
 * @returns true if the hash is valid, false if tampered or missing
 */
export function verifySnapshotIntegrity(snapshot: StoredSnapshot): boolean {
  if (snapshot.stateHash === undefined || snapshot.stateHash === "") {
    return false;
  }
  const expected = computeSnapshotHash(snapshot.state);
  return snapshot.stateHash === expected;
}

/**
 * Snapshot store interface.
 *
 * Provides CRUD operations for snapshots. Implementations can use
 * in-memory storage, file system, or database.
 */
export interface SnapshotStore {
  /**
   * Save a snapshot.
   *
   * Overwrites any existing snapshot for the same stream at the same version.
   */
  save(options: SaveSnapshotOptions): void;

  /**
   * Load the latest snapshot for a stream.
   *
   * @returns The most recent snapshot, or undefined if none exists
   */
  load(streamId: string): StoredSnapshot | undefined;

  /**
   * Load a snapshot at a specific version.
   *
   * @returns The snapshot at that version, or undefined if none exists
   */
  loadAtVersion(streamId: string, version: number): StoredSnapshot | undefined;

  /**
   * Delete all snapshots for a stream.
   */
  deleteAll(streamId: string): void;

  /**
   * Check if any snapshot exists for a stream.
   */
  hasSnapshot(streamId: string): boolean;
}

// =============================================================================
// In-Memory Implementation
// =============================================================================

/**
 * In-memory snapshot store.
 *
 * Stores snapshots in a Map. Suitable for tests and development.
 */
export class InMemorySnapshotStore implements SnapshotStore {
  /** streamId → version-sorted snapshots */
  private readonly _snapshots = new Map<string, StoredSnapshot[]>();

  save(options: SaveSnapshotOptions): void {
    let snapshots = this._snapshots.get(options.streamId);
    if (snapshots === undefined) {
      snapshots = [];
      this._snapshots.set(options.streamId, snapshots);
    }

    // Remove existing snapshot at same version (if any)
    const existingIndex = snapshots.findIndex(
      (s) => s.version === options.version,
    );
    if (existingIndex >= 0) {
      snapshots.splice(existingIndex, 1);
    }

    const snapshot: StoredSnapshot = {
      streamId: options.streamId,
      version: options.version,
      state: options.state,
      createdAt: new Date().toISOString(),
      stateHash: computeSnapshotHash(options.state),
    };

    // Insert sorted by version
    const insertIndex = snapshots.findIndex(
      (s) => s.version > options.version,
    );
    if (insertIndex >= 0) {
      snapshots.splice(insertIndex, 0, snapshot);
    } else {
      snapshots.push(snapshot);
    }
  }

  load(streamId: string): StoredSnapshot | undefined {
    const snapshots = this._snapshots.get(streamId);
    if (snapshots === undefined || snapshots.length === 0) {
      return undefined;
    }
    // Return the last (highest version) snapshot
    return snapshots[snapshots.length - 1];
  }

  loadAtVersion(
    streamId: string,
    version: number,
  ): StoredSnapshot | undefined {
    const snapshots = this._snapshots.get(streamId);
    if (snapshots === undefined) {
      return undefined;
    }
    return snapshots.find((s) => s.version === version);
  }

  deleteAll(streamId: string): void {
    this._snapshots.delete(streamId);
  }

  hasSnapshot(streamId: string): boolean {
    const snapshots = this._snapshots.get(streamId);
    return snapshots !== undefined && snapshots.length > 0;
  }
}

// =============================================================================
// File-Based Implementation
// =============================================================================

/**
 * File-based snapshot store.
 *
 * Stores each snapshot as a JSON file in a directory structure:
 *   <baseDir>/<streamId>/<version>.json
 *
 * Suitable for development and small-scale production use.
 */
export class FileSnapshotStore implements SnapshotStore {
  private readonly _baseDir: string;

  constructor(baseDir: string) {
    this._baseDir = baseDir;
    mkdirSync(this._baseDir, { recursive: true });
  }

  save(options: SaveSnapshotOptions): void {
    const dir = this._streamDir(options.streamId);
    mkdirSync(dir, { recursive: true });

    const snapshot: StoredSnapshot = {
      streamId: options.streamId,
      version: options.version,
      state: options.state,
      createdAt: new Date().toISOString(),
      stateHash: computeSnapshotHash(options.state),
    };

    const filePath = this._snapshotPath(options.streamId, options.version);
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  }

  load(streamId: string): StoredSnapshot | undefined {
    const versions = this._listVersions(streamId);
    if (versions.length === 0) {
      return undefined;
    }

    // Latest version is the highest number
    const latestVersion = versions[versions.length - 1]!;
    return this._readSnapshot(streamId, latestVersion);
  }

  loadAtVersion(
    streamId: string,
    version: number,
  ): StoredSnapshot | undefined {
    return this._readSnapshot(streamId, version);
  }

  deleteAll(streamId: string): void {
    const dir = this._streamDir(streamId);
    if (!existsSync(dir)) {
      return;
    }

    const files = readdirSync(dir);
    for (const file of files) {
      unlinkSync(join(dir, file));
    }
  }

  hasSnapshot(streamId: string): boolean {
    const versions = this._listVersions(streamId);
    return versions.length > 0;
  }

  /** Get the base directory for this store */
  get baseDir(): string {
    return this._baseDir;
  }

  // ─── Internal ───────────────────────────────────────────────────────

  private _streamDir(streamId: string): string {
    // Sanitize stream ID for filesystem use
    const safe = streamId.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return join(this._baseDir, safe);
  }

  private _snapshotPath(streamId: string, version: number): string {
    return join(this._streamDir(streamId), `${version}.json`);
  }

  private _listVersions(streamId: string): number[] {
    const dir = this._streamDir(streamId);
    if (!existsSync(dir)) {
      return [];
    }

    const files = readdirSync(dir);
    const versions: number[] = [];

    for (const file of files) {
      const match = file.match(/^(\d+)\.json$/);
      if (match !== null) {
        versions.push(Number(match[1]));
      }
    }

    return versions.sort((a, b) => a - b);
  }

  private _readSnapshot(
    streamId: string,
    version: number,
  ): StoredSnapshot | undefined {
    const filePath = this._snapshotPath(streamId, version);
    if (!existsSync(filePath)) {
      return undefined;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content) as StoredSnapshot;
    } catch {
      return undefined;
    }
  }
}
