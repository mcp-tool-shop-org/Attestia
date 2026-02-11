# RFC Process

How Attestia specifications are proposed, reviewed, and finalized.

---

## Overview

Attestia specifications live in the `specs/` directory as RFC documents. Each RFC follows a defined lifecycle from initial draft to final standard. This process ensures that normative specifications receive adequate review before implementations depend on them.

---

## RFC Lifecycle

```
Draft ──> Review ──> Final ──> Superseded (optional)
  │                   │
  └── Withdrawn       └── Errata (minor corrections)
```

### States

| State | Meaning |
|-------|---------|
| **Draft** | Initial authoring. Content may change substantially. Implementations SHOULD NOT depend on draft specs. |
| **Review** | Specification is complete. Open for community and stakeholder review. Content may change based on feedback. |
| **Final** | Specification is stable. Implementations MAY depend on this spec. Changes require a new RFC or formal errata. |
| **Superseded** | Replaced by a newer RFC. The superseding RFC MUST reference what it replaces. |
| **Withdrawn** | Abandoned before reaching Final. Retained in the repository for historical reference. |

### Transitions

| From | To | Trigger |
|------|----|---------|
| Draft | Review | Author declares spec complete; opens review period |
| Draft | Withdrawn | Author abandons the RFC |
| Review | Final | Review period closes with no unresolved objections |
| Review | Draft | Substantive changes required; returns for revision |
| Review | Withdrawn | Fundamental issues discovered; not salvageable |
| Final | Superseded | A new RFC explicitly replaces this one |

---

## Proposing a New RFC

### 1. Allocate a Number

RFC numbers are assigned sequentially. Check the `specs/` directory for the highest existing number and increment by one.

**Naming convention:** `RFC-NNN-SHORT-TITLE.md` where NNN is zero-padded to three digits.

### 2. Use the Template

Every RFC MUST follow this structure:

```markdown
# RFC-NNN: Title

**Status:** Draft
**Created:** YYYY-MM-DD
**Author:** <name or group>

## Abstract
(1 paragraph summary)

## Status of This Document
(Current state and any review notes)

## 1. Introduction
(Problem statement, motivation)

## 2. Terminology
(References specs/DEFINITIONS.md + RFC-specific terms)

## 3. Specification
(Normative content using RFC 2119 keywords: MUST, SHOULD, MAY)

## 4. Algorithms
(Pseudocode or TypeScript for computations, state machines, etc.)

## 5. Security Considerations

## 6. Conformance
(What it means to implement this spec)

## 7. References
(Source files, external standards)
```

### 3. Submit for Review

Create a governance proposal (Class A for documentation-only, Class B/C if the RFC drives code changes) and open a pull request. The PR description MUST include:

- RFC number and title
- Brief summary of what the spec covers
- Any dependencies on other RFCs

---

## Review Process

### Review Period

- **Minimum review period:** 7 days for Draft → Review transition
- **Minimum review period:** 14 days for Review → Final transition

### Reviewers

Any contributor may review. For Final status, at least one reviewer MUST have:

- Read the full specification
- Verified that normative interfaces match the referenced source code
- Confirmed that algorithms are implementable from the spec alone

### Objections

Objections MUST be specific and actionable. An objection MUST state:

1. Which section is problematic
2. What the problem is
3. A proposed resolution (or a request for clarification)

Unresolved objections block the Review → Final transition.

---

## Versioning

### RFC Immutability

Once an RFC reaches **Final** status, its normative content MUST NOT change. Corrections and additions follow one of two paths:

| Change Type | Path |
|-------------|------|
| Typographical or editorial fixes | Errata appendix added to the existing RFC |
| Substantive changes (new fields, changed algorithms, modified requirements) | New RFC that supersedes the original |

### Errata

Errata are appended to the RFC as a new section:

```markdown
## Errata

### E1 — YYYY-MM-DD
- Section 3.2: Corrected "MUST" to "SHOULD" for optional field validation
- No semantic change to conforming implementations
```

### Supersession

When a new RFC supersedes an existing one:

1. The new RFC MUST include a "Supersedes" field in its header
2. The old RFC's status MUST be changed to "Superseded" with a reference to the new RFC
3. Both documents remain in the repository

---

## Relationship to Change Classes

RFCs interact with the governance change class system:

| Scenario | Change Class |
|----------|-------------|
| New RFC (documentation only, no code changes) | Class A |
| New RFC that requires code changes to conform | Class B or C (depending on semantic impact) |
| RFC errata (editorial only) | Class A |
| RFC supersession with code changes | Class B or C |

The governance proposal for an RFC-driven code change MUST reference the relevant RFC(s).

---

## Backward Compatibility

### Breaking Changes

An RFC that changes the GlobalStateHash computation, event schema, or hash chain algorithm is a **breaking change**. Breaking changes:

1. MUST be documented in a new RFC (not errata)
2. MUST include a migration path
3. MUST specify a version boundary (e.g., "implementations conforming to RFC-004 v1 are not compatible with RFC-004 v2")
4. Require Class C governance approval if they affect existing deployments

### Non-Breaking Extensions

Adding new optional fields, new subsystems to the GlobalStateHash, or new event types is non-breaking if:

1. Existing implementations continue to function without the extension
2. The extension is documented in a new RFC
3. The original RFC is not modified

---

## References

- `specs/` — All RFC documents
- `specs/DEFINITIONS.md` — Shared normative definitions
- `CHANGE_CLASSES.md` — Change classification taxonomy
- `DECISION_ARTIFACTS.md` — Governance decision records

---

*This document governs how specifications evolve. The change class system governs how code evolves. Together they ensure that both specification and implementation changes follow a predictable, auditable process.*
