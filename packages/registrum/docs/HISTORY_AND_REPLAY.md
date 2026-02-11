# History and Replay

## Purpose

This document explains what it means for Registrum to be "historical" and why Phase E (Persistence, Serialization & Replay) was necessary.

---

## What "Historical" Means

A system is **historical** if its past decisions can be:

1. **Recorded** — Captured without loss
2. **Preserved** — Stored without interpretation
3. **Restored** — Loaded without modification
4. **Replayed** — Re-executed with identical outcomes
5. **Audited** — Inspected after the fact

Most systems are not historical. They make decisions, discard context, and cannot explain themselves later.

Registrum is historical.

---

## The Lifecycle

```
┌─────────────┐
│   LIVE      │  Transitions are registered
│  EXECUTION  │  Decisions are made
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  SNAPSHOT   │  State is captured
│             │  No interpretation
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SERIALIZE   │  JSON output
│             │  Bitwise deterministic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   STORE     │  File, database, etc.
│             │  (Not Registrum's concern)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ DESERIALIZE │  Parse JSON
│             │  Validate schema
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  REHYDRATE  │  Reconstruct registrar
│             │  Exact or fail
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   REPLAY    │  Re-execute transitions
│             │  Prove determinism
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   AUDIT     │  Compare outcomes
│             │  Verify history
└─────────────┘
```

---

## Live Execution vs. Replay

### Live Execution

During live execution:
- A registrar is created (empty or rehydrated)
- Transitions are proposed
- Invariants are evaluated
- Decisions are made
- State changes

Live execution is **forward-looking**. You don't know what will happen until it happens.

### Replay

During replay:
- A fresh registrar is created
- The same transitions are re-proposed
- Invariants are re-evaluated
- Decisions are re-made
- Outcomes are compared

Replay is **backward-looking**. You already know what happened; you're proving it was deterministic.

### Key Difference

| Property | Live Execution | Replay |
|----------|----------------|--------|
| Mutates state | ✅ Yes | ✅ Yes (fresh registrar) |
| Persists state | Optional | ❌ Never |
| Purpose | Make decisions | Verify decisions |
| Outcome | New state | Report |

---

## Why Replay Is Read-Only

Replay creates a fresh registrar and executes transitions, but it never:
- Modifies the input transitions
- Persists any state
- Affects the original registrar
- Changes any snapshot

Replay is a **proof mechanism**, not a restoration mechanism.

If you want to restore state, use `fromSnapshot()`. If you want to verify history, use `replay()`.

---

## Why No Divergence Is Tolerated

The `ReplayReport` type includes:

```typescript
readonly divergence?: never;
```

This is not a placeholder. It's a type-level declaration that divergence is structurally forbidden.

If replay produces different outcomes than live execution:
- It's a bug in Registrum
- It's not a recoverable condition
- It invalidates the historical property

Divergence would mean:
- Determinism is broken
- Audit trails are unreliable
- History can be reinterpreted

None of these are acceptable.

---

## Snapshot vs. Replay

Snapshots and replay serve different purposes:

| Capability | Snapshot | Replay |
|------------|----------|--------|
| Captures state | ✅ Yes | ❌ No |
| Captures transitions | ❌ No | ✅ Yes (input) |
| Proves determinism | ❌ No | ✅ Yes |
| Enables restoration | ✅ Yes | ❌ No |
| Enables audit | Partial | ✅ Full |

To fully audit a registrar's history, you need:
1. The original transitions (recorded by your system)
2. The ability to replay them
3. Comparison with the original outcomes

Registrum provides #2 and #3. Your system provides #1.

---

## Recording Transitions

Registrum does not automatically record transitions. This is intentional:
- Storage is not Registrum's concern
- Format is application-dependent
- Retention policy varies

If you want replay capability, your system must:
1. Record transitions as they occur
2. Store them durably
3. Provide them to `replay()` when needed

The `TransitionRecorder` utility is provided for testing, but production systems should implement their own storage.

---

## Example: Full Audit Cycle

```typescript
// 1. Live execution (your system records transitions)
const registrar = new StructuralRegistrar({ mode: "legacy" });
const transitions: Transition[] = [];

for (const proposed of incomingTransitions) {
  const result = registrar.register(proposed);
  transitions.push(proposed);  // Record
  results.push(result);        // Record
}

// 2. Snapshot
const snapshot = registrar.snapshot();
const json = serializeSnapshot(snapshot);
await saveToStorage(json);

// 3. Later: Restore and verify
const loaded = await loadFromStorage();
const parsed = deserializeSnapshot(loaded);

// 4. Rehydrate
const restored = StructuralRegistrar.fromSnapshot(parsed, {
  mode: "legacy",
  invariants: INITIAL_INVARIANTS,
});

// 5. Replay
const report = replay(transitions, {
  mode: "legacy",
  invariants: INITIAL_INVARIANTS,
});

// 6. Audit
for (let i = 0; i < results.length; i++) {
  const original = results[i];
  const replayed = report.results[i].result;

  assert(original.kind === replayed.kind);
  // ... further verification
}
```

---

## What Phase E Proved

Phase E established:

1. **Snapshots are deterministic** — Same state produces same JSON
2. **Rehydration is exact** — Restored registrar matches original
3. **Replay is deterministic** — Same transitions produce same outcomes
4. **Modes are equivalent under replay** — Legacy ≡ registry

These properties are backed by 109 persistence tests.

---

## Summary

| Concept | Purpose | Guarantees |
|---------|---------|------------|
| Snapshot | Capture state | Deterministic, complete |
| Serialize | Produce JSON | Bitwise identical |
| Rehydrate | Restore state | Exact or fail |
| Replay | Prove determinism | No divergence |
| Audit | Verify history | Full traceability |

Registrum is historical because all of these work together.

---

*This document explains Phase E. It justifies why persistence matters.*
