# Attestia — Upgrade Guide

How to deploy a new version without losing state.

---

## State Persistence Model

Attestia uses append-only persistence:

- **Events**: JSONL file (one event per line, append-only, hash-chained)
- **Snapshots**: JSON files with embedded `stateHash`
- **Configuration**: Environment variables (no config files to migrate)

---

## Upgrade Steps

### 1. Stop the Running Instance

```bash
# Docker
docker compose down

# Direct
kill -SIGTERM <pid>  # Graceful shutdown
```

Attestia handles SIGTERM gracefully, flushing pending writes.

### 2. Back Up Data

```bash
# Copy JSONL event file and snapshots
cp data/events.jsonl data/events.jsonl.bak
cp data/snapshots/ data/snapshots.bak/ -r
```

### 3. Deploy New Version

```bash
# Docker
docker compose pull
docker compose up -d

# Direct
git pull
pnpm install
pnpm build
node packages/node/dist/main.js
```

### 4. Verify Startup

The new version automatically:

1. Loads the existing JSONL file
2. Verifies the hash chain integrity
3. Reports subsystem status via `/ready`

Check health:

```bash
curl http://localhost:3000/ready
# Returns: { "status": "ready", "tenants": N, "subsystems": { ... } }
```

### 5. Verify State Continuity

Export state and compare hashes:

```bash
curl http://localhost:3000/api/v1/export/state -o state-after.json
```

The `globalStateHash` should be identical to the pre-upgrade value (same events produce same state).

---

## Schema Migration

Attestia's `EventCatalog` handles event schema evolution:

- Events are stored with their original version in metadata
- On read, the catalog automatically upcasts old events to the current version
- Upcasters are pure functions: `(oldPayload) => newPayload`
- The JSONL file is never modified; migration happens at read time

To verify migrations work:

```bash
pnpm --filter @attestia/event-store test -- tests/migration-roundtrip.test.ts
```

---

## Hash Chain Continuation

When upgrading from a pre-hash-chain version:

- Old events (without `hash`/`previousHash` fields) load normally
- New events appended after upgrade will have hash chain fields
- Chain verification starts from the first hashed event
- The `_lastHash` is tracked so the chain continues seamlessly

---

## Docker Volume Mapping

Ensure data volumes persist across container recreations:

```yaml
services:
  attestia:
    volumes:
      - attestia-data:/app/data

volumes:
  attestia-data:
```

The JSONL file path is configured via `ATTESTIA_EVENTS_FILE` environment variable (default: `data/events.jsonl`).

---

## Rollback

If the new version has issues:

1. Stop the new version
2. Restore the backup JSONL file
3. Start the previous version

Because the event store is append-only, events written by the new version appear at the end of the file. If you need to discard them, truncate the file to the backup length. The hash chain will verify correctly up to that point.

---

## Version Compatibility

| From | To | Migration Required | Notes |
|------|----|--------------------|-------|
| Pre-hash-chain | Post-hash-chain | No | Old events load without hashes; new events get hashes |
| Pre-retry | Post-retry | No | New retry config uses defaults if not specified |
| Pre-audit-log | Post-audit-log | No | Audit log starts empty on first run |
