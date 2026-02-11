# Packaging Integrity

*See also: [Release Checklist (Pre-Publish Invariant)](RELEASE_CHECKLIST.md)*

---

## Why This Exists

If you're evaluating Registrum for adoption, you're likely asking a simple question:

> "Can I trust the published artifact to mean what it says, and stay reproducible over time?"

Many libraries answer that question implicitly. Registrum answers it explicitly.

Registrum's core promise is **verifiability**. That means packaging details (version identifiers, license clarity, integrity vs cryptographic guarantees, and documented execution assumptions) are treated as part of the system's epistemic surface — not as "polish."

**Registrum treats packaging correctness as a first-class design concern.**

---

## Packaging Is Part of the System

Registrum's core promise is not convenience — it is verifiability.

Anything that can undermine:
- audit chains
- replay guarantees
- consumer trust
- legal clarity

...is considered **part of the system**, even if it does not affect runtime behavior.

Version numbers, licenses, hashes, and examples are therefore **structural components**, not decoration.

---

## Single Source of Truth

Registrum enforces a single authoritative source for externally visible facts:

| Fact | Source |
|------|--------|
| Version | `src/version.ts` |
| License | `LICENSE` file |
| Integrity checksum | `computeSnapshotChecksum32` (djb2) |
| Cryptographic hash | `computeSnapshotHashForAttestation` (SHA-256) |

Duplication without enforcement is treated as a bug, not a convenience.

---

## Precision of Meaning

Registrum distinguishes sharply between:

| Term | Meaning | Use Case |
|------|---------|----------|
| **Checksum** | Lightweight integrity verification (djb2) | Corruption detection, equality checks |
| **Cryptographic hash** | Security and attestation (SHA-256) | External witnessing, attestation payloads |

Names, documentation, and APIs reflect this distinction explicitly.

**Ambiguity is considered a correctness failure.**

---

## No Implicit Trust

Registrum does not rely on:
- implied guarantees
- conventional assumptions
- undocumented tooling behavior

If something is required to run, verify, or reproduce Registrum artifacts, it is stated explicitly.

### Examples

| Requirement | Documentation |
|-------------|---------------|
| Example execution | README states `tsx`/`ts-node` requirement |
| Snapshot format | `CANONICAL_SERIALIZATION.md` defines exact schema |
| Version source | `src/version.ts` is canonical |
| License | `LICENSE` file matches `package.json` |

---

## Relationship to Releases

All published releases are expected to satisfy the constraints defined in:

- [**RELEASE_CHECKLIST.md**](RELEASE_CHECKLIST.md)

Together, these documents ensure that every Registrum release is:

- Legally consumable
- Operationally predictable
- Externally auditable
- Safe to embed in higher-integrity systems

---

## Summary

**Packaging integrity is not polish.**

**It is part of the constitution.**

---

*This document is a governance artifact.*
*It explains why packaging correctness matters for Registrum's trust model.*
