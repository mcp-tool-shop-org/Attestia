# Failure Boundaries

## Purpose

This document defines where Registrum refuses to operate and why fail-closed behavior is a feature, not a limitation.

Understanding failure boundaries is essential for correctly integrating Registrum.

---

## Hard Failure Conditions

Registrum will fail completely (throw an error) under the following conditions:

### 1. Invalid Snapshot Schema

**Trigger:** Attempting to rehydrate from a snapshot with invalid structure.

**Failures include:**
- Missing required fields (`version`, `registry_hash`, `mode`, `state_ids`, `lineage`, `ordering`)
- Unknown fields (strict mode rejects extra data)
- Wrong types (e.g., `state_ids` is not an array)
- Unsupported version
- Internal inconsistency (e.g., state in `state_ids` missing from `lineage`)

**Error:** `SnapshotValidationError`

**Why:** An invalid snapshot cannot be trusted. Partial interpretation would introduce uncertainty about what state was actually restored.

### 2. Registry Hash Mismatch

**Trigger:** Attempting to rehydrate a snapshot created with different invariants.

**Example:** Snapshot was created with invariants `[A, B, C]` but rehydration uses `[A, B, D]`.

**Error:** `RegistryMismatchError`

**Why:** Different invariants produce different judgments. Rehydrating with mismatched invariants would silently change the meaning of the restored state.

### 3. Mode Mismatch

**Trigger:** Attempting to rehydrate a legacy-mode snapshot as registry-mode (or vice versa).

**Error:** `ModeMismatchError`

**Why:** Although legacy and registry modes are behaviorally equivalent, they are not interchangeable at the persistence layer. The mode is part of the snapshot's identity.

### 4. Invariant Violation (Halt Mode)

**Trigger:** A transition violates an invariant with `failureMode: "halt"`.

**Halt-level invariants:**
- `state.identity.unique` — Identity collision
- `state.lineage.continuous` — Broken lineage chain
- `ordering.total` — Missing total ordering
- `ordering.deterministic` — Non-deterministic ordering
- `ordering.non_semantic` — Semantic-dependent ordering

**Behavior:** Registration is rejected with `[HALT]` marker in violation messages.

**Why:** Halt violations indicate systemic corruption, not a local error. The registrar cannot safely continue without understanding what went wrong.

### 5. Missing Required Options

**Trigger:** Creating a registrar or rehydrating without required configuration.

**Examples:**
- Registry mode without `compiledRegistry`
- Rehydration without `invariants` (legacy mode)
- Rehydration without `compiledRegistry` (registry mode)

**Error:** `RehydrationError` or constructor error

**Why:** Operating without required configuration would produce undefined behavior.

---

## Why Fail-Closed Is a Feature

### The Alternative Is Worse

Consider what "helpful" recovery would look like:

| Failure | "Helpful" Recovery | Consequence |
|---------|-------------------|-------------|
| Invalid snapshot | Load what we can | Unknown state restored |
| Registry mismatch | Use current invariants | Past decisions reinterpreted |
| Mode mismatch | Convert automatically | Silent semantic drift |
| Halt violation | Continue anyway | Corrupted lineage propagates |

Every "helpful" recovery introduces uncertainty. Registrum's value comes from certainty.

### Fail-Closed Preserves Trust

When Registrum succeeds, you know:
- The snapshot was valid
- The invariants match
- The mode matches
- The restored state is exact

When Registrum fails, you know:
- Something is wrong
- The error tells you what
- No partial state was produced

This is a better contract than "it probably worked."

### Fail-Closed Enables Auditability

If Registrum could silently recover, audit logs would be meaningless. You couldn't distinguish between:
- "This state was validly restored"
- "This state was approximately restored"

Fail-closed means success is unambiguous.

---

## What Registrum Will Never Attempt

The following recovery strategies are **permanently forbidden**:

### 1. Partial Snapshot Recovery

Registrum will never load "most of" a snapshot. Either the entire snapshot is valid, or none of it is loaded.

**Rationale:** Partial state is indistinguishable from corrupted state.

### 2. Invariant Migration

Registrum will never automatically update a snapshot to match new invariants.

**Rationale:** Invariant changes are governance decisions, not technical migrations.

### 3. Mode Conversion

Registrum will never convert a legacy snapshot to registry mode (or vice versa) during rehydration.

**Rationale:** Mode is part of identity, not a configuration option.

### 4. Silent Fallback

Registrum will never fall back to a default state when loading fails.

**Rationale:** Defaults would mask failures and corrupt audit trails.

### 5. Best-Effort Replay

Registrum will never skip invalid transitions during replay to "get as far as possible."

**Rationale:** Replay proves determinism. Skipping transitions would make the proof meaningless.

---

## Handling Failures Correctly

### At Rehydration Time

```typescript
try {
  const registrar = StructuralRegistrar.fromSnapshot(snapshot, options);
  // Success: snapshot was valid, state is exact
} catch (e) {
  if (e instanceof SnapshotValidationError) {
    // Snapshot structure is invalid
    // Action: Reject the snapshot, do not proceed
  } else if (e instanceof RegistryMismatchError) {
    // Invariants don't match
    // Action: Use correct invariants or reject
  } else if (e instanceof ModeMismatchError) {
    // Mode doesn't match
    // Action: Use correct mode or reject
  }
}
```

### At Registration Time

```typescript
const result = registrar.register(transition);

if (result.kind === "rejected") {
  const hasHalt = result.violations.some(v => v.message.includes("[HALT]"));

  if (hasHalt) {
    // Systemic corruption detected
    // Action: Stop processing, investigate
  } else {
    // Local violation
    // Action: Reject transition, continue with others
  }
}
```

### At Replay Time

```typescript
const report = replay(transitions, options);

if (report.halted > 0) {
  // Some transitions caused halt violations
  // Action: Investigate the specific transitions
}

// Note: Replay never throws. It reports all outcomes.
```

---

## Summary

| Failure Type | Error | Recovery Allowed |
|--------------|-------|------------------|
| Invalid snapshot | `SnapshotValidationError` | ❌ No |
| Registry mismatch | `RegistryMismatchError` | ❌ No |
| Mode mismatch | `ModeMismatchError` | ❌ No |
| Halt violation | `[HALT]` in violation | ❌ No |
| Reject violation | Normal rejection | ✅ Yes (by caller) |
| Missing options | Constructor/rehydration error | ❌ No |

**Fail-closed is the correct behavior for a constitutional system.**

---

*This document defines boundaries. It protects against "helpful" future changes.*
