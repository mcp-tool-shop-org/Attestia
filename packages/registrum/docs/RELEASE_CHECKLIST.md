# Registrum Release Checklist (Pre-Publish Invariant)

*See also: [Packaging Integrity](PACKAGING_INTEGRITY.md)*

---

This checklist defines non-negotiable pre-publish conditions for Registrum releases. It exists to ensure that every published artifact preserves epistemic integrity, auditability, and consumer trust.

**This checklist is Class A**: it governs packaging correctness only. It must not introduce new semantics, authority, or behavior.

---

## A. Version Authority & Consistency

**Invariant**: The released package has exactly one authoritative version identifier, and all externally visible artifacts agree on it.

| Check | Description |
|-------|-------------|
| [ ] | `src/version.ts` contains the authoritative `REGISTRUM_VERSION` |
| [ ] | `package.json` version matches `REGISTRUM_VERSION` |
| [ ] | Attestation payloads use `REGISTRUM_VERSION` |
| [ ] | No hardcoded version strings outside `src/version.ts` |

**Failure mode if violated**: Broken audit chains, unverifiable attestations, downstream tooling ambiguity.

---

## B. License & Legal Completeness

**Invariant**: The package is legally consumable without interpretation.

| Check | Description |
|-------|-------------|
| [ ] | `LICENSE` file exists at repository root |
| [ ] | License text matches `package.json` license field (MIT) |
| [ ] | Copyright year and holder are accurate |

**Failure mode if violated**: Automated compliance rejection; blocked adoption in regulated environments.

---

## C. Determinism & Reproducibility Guard

**Invariant**: No release introduces nondeterminism via build, runtime, or metadata.

| Check | Description |
|-------|-------------|
| [ ] | No `Date.now()` or `Math.random()` in deterministic paths |
| [ ] | No floating-point values in structural serialization |
| [ ] | Timestamp format is ISO 8601 with consistent precision |
| [ ] | All 279+ tests pass |

**Failure mode if violated**: Replay divergence; unverifiable historical state.

---

## D. Hashing & Integrity Semantics

**Invariant**: All integrity mechanisms are precisely named and documented according to their guarantees.

| Check | Description |
|-------|-------------|
| [ ] | `computeSnapshotChecksum32` is used for non-cryptographic integrity |
| [ ] | `computeSnapshotHashForAttestation` (SHA-256) is used for cryptographic witnessing |
| [ ] | No ambiguous "hash" terminology without qualification |
| [ ] | `CANONICAL_SERIALIZATION.md` accurately describes guarantees |

**Failure mode if violated**: Security misinterpretation; incorrect trust assumptions.

---

## E. CLI & Example Execution Hygiene

**Invariant**: All documented commands are predictable and explain their execution assumptions.

| Check | Description |
|-------|-------------|
| [ ] | README explains example execution requirements (`tsx`/`ts-node`) |
| [ ] | Examples are marked as illustrative, not stable API |
| [ ] | `npm run` scripts work as documented |
| [ ] | No undocumented CLI entry points |

**Failure mode if violated**: User confusion; CI inconsistencies; perceived instability.

---

## F. Test & Documentation Alignment

**Invariant**: Documentation describes the system as shipped, not aspirationally.

| Check | Description |
|-------|-------------|
| [ ] | Test count in README matches actual (`npm test`) |
| [ ] | Phase status in README matches governance records |
| [ ] | All linked documentation files exist |
| [ ] | No "TODO" or "FIXME" in shipped documentation |

**Failure mode if violated**: Trust erosion; misaligned expectations.

---

## Release Gate

A release may proceed **only** if all sections A–F pass.

If any item fails:
1. **Fix the issue**, or
2. **Abort the release**

**There are no waivers for Class A violations.**

---

*This checklist is a governance artifact.*
*It ensures packaging correctness without introducing semantic drift.*
