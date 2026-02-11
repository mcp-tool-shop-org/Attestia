# Versioning Rules

Registrum uses semantic versioning with constitutional meaning.

Version bumps are governance outcomes, not implementation choices.

---

## Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

| Component | Meaning | Governance |
|-----------|---------|------------|
| MAJOR | Semantic change (guarantees altered) | Class C |
| MINOR | Structural change (behavior preserved) | Class B |
| PATCH | Non-semantic change | Class A |

---

## Version Bump Rules

### Patch Version (X.Y.Z → X.Y.Z+1)

**Trigger:** Class A changes

**Examples:**
- Bug fixes (behavior remains identical)
- Performance improvements (with parity proof)
- Documentation clarifications (non-claims)
- Test additions (not removals)
- Internal refactoring (public API stable)

**Governance:** None required

### Minor Version (X.Y.Z → X.Y+1.0)

**Trigger:** Class B changes

**Examples:**
- Default mode switch (legacy → registry)
- Internal implementation replacement (with parity)
- Snapshot schema format change (semantics preserved)
- Deprecation notices (not removal)

**Governance:** Steward approval required

**Resets:** Patch version resets to 0

### Major Version (X.Y.Z → X+1.0.0)

**Trigger:** Class C changes

**Examples:**
- Invariant addition
- Invariant removal
- Invariant modification
- Predicate DSL grammar change
- Snapshot semantic change
- Replay semantic change
- Fail-closed → fail-open (or reverse)

**Governance:** Steward approval with guarantee acknowledgment

**Resets:** Minor and patch versions reset to 0

---

## Constitutional Versioning

### Invariants Are Constitutional

Changes to invariants change the system's meaning.

| Invariant Change | Version Impact |
|------------------|----------------|
| Addition | Major bump |
| Removal | Major bump |
| Modification | Major bump |
| Reordering (no semantic change) | No bump |

### Snapshot Schema Is Constitutional

Changes to snapshot schema affect persistence identity.

| Schema Change | Version Impact |
|---------------|----------------|
| Field addition (optional) | Minor bump |
| Field addition (required) | Major bump |
| Field removal | Major bump |
| Field type change | Major bump |
| Serialization format change | Minor bump (if semantically equivalent) |

### Replay Semantics Are Constitutional

Changes to replay behavior affect temporal guarantees.

| Replay Change | Version Impact |
|---------------|----------------|
| Output format change | Minor bump |
| Determinism guarantee change | Major bump |
| New replay mode | Minor bump |
| Replay behavior change | Major bump |

---

## Pre-1.0 Versioning

Until v1.0.0:
- API is considered unstable
- Minor bumps may include breaking changes
- Major bump to 1.0.0 signals stability commitment

Current status: Pre-1.0 (v0.x.x)

Phase D (cutover) would trigger: v1.0.0

---

## Version Compatibility

### Backward Compatibility

| Version Relationship | Compatibility |
|---------------------|---------------|
| Patch to patch | Full |
| Minor to minor | API compatible |
| Major to major | May break |

### Snapshot Compatibility

| Snapshot Version | Registrar Version | Compatible? |
|------------------|-------------------|-------------|
| v1 | v1.x.x | Yes |
| v1 | v2.x.x | Requires migration |

### Forward Compatibility

Registrum does not guarantee forward compatibility.
- Older registrar cannot read newer snapshots
- This is intentional (fail-closed)

---

## Version Artifacts

Every version bump must include:

### Patch

- Changelog entry
- Passing tests

### Minor

- Changelog entry
- Passing tests
- Decision record reference

### Major

- Changelog entry
- Passing tests
- Decision record reference
- Migration guide
- Guarantee impact documentation

---

## Release Process

### Patch Release

1. Changes merged to main
2. Tests pass
3. Version bumped in package.json
4. Changelog updated
5. Tag created

### Minor Release

1. Governance approval obtained
2. Decision record created
3. Changes merged to main
4. Tests pass
5. Version bumped
6. Changelog updated
7. Tag created

### Major Release

1. Governance approval with guarantee acknowledgment
2. Decision record created
3. Migration guide written
4. Changes merged to main
5. Tests pass
6. Version bumped
7. Changelog updated
8. Tag created

---

## Version History

| Version | Date | Classification | Change |
|---------|------|----------------|--------|
| 0.1.0 | — | Initial | Phase A-C implementation |
| — | — | — | [Future entries] |

---

*This document defines versioning rules. Emergency procedures are in `EMERGENCY_POWERS.md`.*
