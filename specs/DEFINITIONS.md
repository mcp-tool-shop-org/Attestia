# Attestia Specification — Normative Definitions

**Status:** Draft
**Created:** 2026-02-11
**Author:** Attestia Working Group

---

This document defines the canonical meanings of terms used across Attestia specifications. These definitions are normative. Implementations claiming conformance MUST use these terms as defined here.

This document extends `packages/registrum/docs/DEFINITIONS.md` (Registrum-specific terms) to cover the full Attestia system.

---

## Key Words

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in Attestia specifications are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## Financial Primitives

### Money

A precise monetary amount represented as a string to avoid IEEE 754 floating-point errors. A Money value consists of an `amount` (string), `currency` (symbol or ISO 4217 code), and `decimals` (integer specifying precision).

### Account

A named ledger position with a type (asset, liability, income, expense, equity) that accumulates debit and credit entries.

### Ledger Entry

A single line in the double-entry ledger. Always part of a balanced transaction where total debits equal total credits. Immutable after creation.

### Trial Balance

The sum of all debit and credit entries across all accounts. A correct ledger always produces a zero-sum trial balance.

---

## Intent Lifecycle

### Intent

A proposed financial action captured before execution. An Intent is declarative (describes the desired outcome, not the mechanism), approvable (requires human sign-off), traceable (every state change is recorded), and verifiable (post-execution reconciliation confirms the outcome).

### Intent Status

The lifecycle state of an Intent. The complete set of states is: `declared`, `approved`, `rejected`, `executing`, `executed`, `verified`, `failed`.

### Declaration

The act of creating an Intent. Records who proposed the action, when, and with what parameters.

### Approval

A human decision to authorize a declared Intent for execution. May include a reason.

### Execution

The act of carrying out an approved Intent, typically resulting in an on-chain transaction. Records the chain identifier and transaction hash.

### Verification

Post-execution confirmation that the on-chain outcome matches the declared intent. Records whether the result matched and any discrepancies found.

---

## Event Sourcing

### Domain Event

An immutable record of something that happened in the system. Every state change in Attestia is captured as a DomainEvent. Events are never modified or deleted after creation.

### Event Metadata

Contextual information attached to every domain event: unique event identifier, timestamp, actor (who or what caused the event), correlation identifier (for grouping related events), and source subsystem.

### Stream

An ordered sequence of domain events sharing a common stream identifier. Events within a stream have monotonically increasing version numbers starting at 1. A stream typically represents the history of a single aggregate (e.g., one intent, one account).

### Global Position

A monotonically increasing integer assigned to each event across all streams. Provides a total ordering of all events in the store.

### Stored Event

A domain event as persisted in the event store, wrapped with storage metadata: stream identifier, version (position within stream), global position (position across all streams), and append timestamp.

### Hash Chain

A cryptographic linking structure where each event's hash includes the previous event's hash, forming a tamper-evident chain. Computed using RFC 8785 canonical JSON serialization and SHA-256. See [RFC-001](RFC-001-DETERMINISTIC-EVENT-MODEL.md).

### Genesis Hash

The sentinel value `"genesis"` used as the `previousHash` for the first event in a hash chain.

---

## Reconciliation

### Reconciliation

The process of cross-referencing records from multiple subsystems to verify consistency. In Attestia, reconciliation is 3-dimensional: intent records, ledger entries, and on-chain events are matched across three axes.

### Match Status

The outcome of comparing two records across subsystems. Possible values: `matched` (both present, values agree), `amount-mismatch` (both present, amounts differ), `missing-ledger`, `missing-intent`, `missing-chain`, `unmatched`.

### Reconciliation Report

A complete record of a reconciliation operation, containing all match results across all three dimensions, scope parameters, and summary statistics.

### Attestation

A signed assertion that a reconciliation was performed and produced a specific result. Contains the reconciliation report hash for integrity verification.

---

## State Verification

### Global State Hash

A single SHA-256 digest covering the entire system state at a point in time. Computed by hashing each subsystem's canonical snapshot independently, then hashing the combined result. If any bit of any subsystem changes, the GlobalStateHash changes. See [RFC-004](RFC-004-GLOBAL-STATE-HASH.md).

### Subsystem Hash

The SHA-256 hash of a single subsystem's canonical snapshot. Preserved in the GlobalStateHash for pinpointing divergence.

### Deterministic Replay

The property that replaying the same events through the same logic produces identical state. Verified by comparing GlobalStateHash values.

### Verification Verdict

The binary outcome of a verification operation: `PASS` (state matches) or `FAIL` (discrepancy found).

---

## Witness

### Witness

An on-chain record proving that an attestation existed at a specific point in time. In Attestia, witnesses are XRPL payment transactions with attestation data encoded in memo fields.

### Witness Record

The complete proof reference: attestation payload, XRPL chain identifier, transaction hash, ledger index, timestamp, and witness account address.

### Attestation Payload

A content-addressed data structure encoded as an XRPL memo. Contains the report hash, source information, and summary statistics.

---

## Governance

### Invariant

A rule that MUST always hold for a state or transition to be considered valid. Invariants are explicit, structural (not semantic), and enforced uniformly. Violation causes rejection.

### Registrar

The constitutional component that validates and orders state transitions by enforcing invariants. The Registrar does not interpret meaning, optimize outcomes, or decide what should happen next.

### Subsystem

A bounded component that produces, transforms, or indexes state. A subsystem has no independent authority and must register all transitions through the Registrar.

---

## Canonical Serialization

### RFC 8785 (JCS)

JSON Canonicalization Scheme. Produces a deterministic byte-for-byte identical JSON representation regardless of original key ordering, whitespace, or formatting. All hash computations in Attestia use RFC 8785 canonicalization.

### SHA-256

The hash function used throughout Attestia for content addressing. Output is a 64-character lowercase hexadecimal string.
