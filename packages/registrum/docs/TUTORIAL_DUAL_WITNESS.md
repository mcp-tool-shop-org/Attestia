# Tutorial: Understanding Dual-Witness Architecture

This tutorial explains how Registrum's dual-witness architecture works and why it matters.

---

## Quick Overview

Registrum uses two independent engines to evaluate invariants:

| Engine | Role | Format |
|--------|------|--------|
| Registry | Primary authority | JSON/DSL |
| Legacy | Secondary witness | TypeScript |

Both must agree for any transition to be accepted.

---

## Why Two Engines?

### Defense in Depth

A bug in one implementation could silently corrupt your data. With two independent engines:

- Each engine catches bugs in the other
- Silent corruption requires simultaneous failure in both
- You get double the audit surface

### Auditability

Different audiences can audit different implementations:

- **Non-programmers** can read the JSON registry
- **Developers** can inspect the TypeScript predicates
- **Both** can verify they produce identical results

---

## How Parity Works

### The Agreement Rule

Every transition is evaluated by both engines:

```
Registry Engine → ACCEPT/REJECT
Legacy Engine   → ACCEPT/REJECT
```

The transition is accepted **only if both agree to accept**:

| Registry | Legacy | Result |
|----------|--------|--------|
| ACCEPT | ACCEPT | ✅ Accepted |
| ACCEPT | REJECT | ❌ HALT |
| REJECT | ACCEPT | ❌ HALT |
| REJECT | REJECT | ❌ Rejected |

### Disagreement = Halt

If the engines disagree, something is fundamentally wrong. Registrum halts rather than guessing which engine is correct.

This is **fail-closed** behavior: safety over availability.

---

## What Gets Evaluated

Both engines evaluate the same 11 invariants:

### Identity Invariants (A.1–A.3)
- `state.identity.immutable` — IDs cannot change
- `state.identity.unique` — IDs must be globally unique
- `state.identity.non_empty` — IDs cannot be empty

### Lineage Invariants (B.1–B.4)
- `lineage.parent.exists` — Parents must exist before children
- `lineage.root.has_null_parent` — Root states have no parent
- `lineage.non_root.has_parent` — Non-root states require a parent
- `lineage.acyclic` — No circular parent chains

### Ordering Invariants (C.1–C.4)
- `ordering.total` — All states get an order index
- `ordering.deterministic` — Same inputs produce same order
- `ordering.monotonic` — Order indices always increase
- `ordering.non_semantic` — Order is structural, not content-based

---

## Using the Engines

### Default Mode (Registry)

As of Phase H, registry is the default:

```typescript
import { StructuralRegistrar } from "registrum";
import { loadInvariantRegistry } from "registrum/registry";

const raw = JSON.parse(fs.readFileSync("invariants/registry.json", "utf-8"));
const compiledRegistry = loadInvariantRegistry(raw);

// Registry mode (default)
const registrar = new StructuralRegistrar({ compiledRegistry });
```

### Legacy Mode (Explicit Selection)

To use the legacy engine directly:

```typescript
// Legacy mode (secondary witness)
const registrar = new StructuralRegistrar({ mode: "legacy" });
```

### Running Both for Verification

To verify parity yourself:

```typescript
// Create both
const legacy = new StructuralRegistrar({ mode: "legacy" });
const registry = new StructuralRegistrar({ mode: "registry", compiledRegistry });

// Register in both
const legacyResult = legacy.register(transition);
const registryResult = registry.register(transition);

// Verify agreement
if (legacyResult.kind !== registryResult.kind) {
  throw new Error("Parity violation!");
}
```

---

## Attestation (Optional)

Registrum can emit attestations to external witnesses like XRPL.

### What Attestation Does

- Records that a decision was made
- Provides tamper-evident history
- Enables external auditability

### What Attestation Does NOT Do

- Does not evaluate invariants
- Does not influence acceptance
- Does not resolve disagreements
- Does not enable self-healing

### Enabling Attestation

```typescript
import { createAttestationConfig, createAttestationHook } from "registrum/attestation";

const config = createAttestationConfig({
  xrpl: {
    enabled: true,
    outputMode: "file",
    outputPath: "./attestations/latest.json",
  },
});

const attestationHook = createAttestationHook(config);

// After creating a snapshot
const payload = generateAttestationPayload(snapshot, registryHash, options);
attestationHook(payload); // Non-blocking, never throws
```

---

## Common Questions

### "Can I disable the legacy engine?"

No. Dual-witness architecture is permanent. Removing either engine would require a Class C governance change.

### "What if the engines disagree?"

The system halts. This is intentional. Disagreement means something is wrong, and Registrum won't guess which engine is correct.

### "Does attestation affect registration?"

No. Attestation is completely independent. Even if attestation fails, registration proceeds normally.

### "Which engine should I trust?"

Both. That's the point. If they disagree, neither should be trusted until the issue is resolved.

---

## Key Takeaways

1. **Two engines** = double the safety
2. **Agreement required** = no silent corruption
3. **Disagreement halts** = fail-closed, not fail-open
4. **Attestation is optional** = witness, not authority
5. **Architecture is permanent** = not a migration step

---

## Further Reading

- [`docs/governance/DUAL_WITNESS_POLICY.md`](governance/DUAL_WITNESS_POLICY.md) — Policy document
- [`docs/PROVABLE_GUARANTEES.md`](PROVABLE_GUARANTEES.md) — Formal claims
- [`docs/WHY_XRPL.md`](WHY_XRPL.md) — Attestation rationale
