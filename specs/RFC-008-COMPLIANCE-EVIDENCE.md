# RFC-008: Compliance Evidence Generation Protocol

**Status:** Draft
**Authors:** Attestia Team
**Created:** 2026-02-11
**Phase:** 12 — Institutionalization & Ecosystem Activation

## 1. Abstract

This RFC defines the protocol for generating machine-readable compliance evidence from Attestia's operational state. It maps controls from established frameworks (SOC 2 Type II, ISO 27001) to Attestia's technical mechanisms and specifies how compliance reports are produced, scored, and distributed.

## 2. Motivation

Regulatory audits require evidence that controls are implemented and effective. Manual evidence gathering is expensive and error-prone. Attestia's event-sourced architecture captures every state change with cryptographic guarantees, making it possible to generate compliance evidence programmatically.

## 3. Compliance Framework Mappings

### 3.1 SOC 2 Type II

SOC 2 Trust Service Criteria are mapped to Attestia controls:

| Trust Criteria | Attestia Control | Evidence Type |
|----------------|------------------|---------------|
| CC1 (Control Environment) | Governance event sourcing | Event replay determinism |
| CC2 (Communication) | Structured audit log | Append-only event trail |
| CC3 (Risk Assessment) | Threat model + control matrix | STRIDE analysis |
| CC4 (Monitoring) | Prometheus metrics + health checks | Runtime telemetry |
| CC5 (Control Activities) | Intent lifecycle state machine | State transition enforcement |
| CC6 (Logical Access) | API key + JWT auth, role-based guards | Auth middleware tests |
| CC7 (System Operations) | Hash chain integrity, startup self-check | Automated verification |
| CC8 (Change Management) | Event catalog versioning, migration support | Schema evolution |
| CC9 (Risk Mitigation) | Multi-sig governance, fail-closed semantics | Quorum enforcement |

### 3.2 ISO 27001

ISO 27001 Annex A controls mapped:

| Annex A Control | Attestia Control | Evidence Type |
|-----------------|------------------|---------------|
| A.8 Asset Management | Ledger tracks all financial assets | Append-only ledger entries |
| A.12 Operations Security | Event store hash chain, integrity checks | SHA-256 chain verification |
| A.14 System Acquisition | Deterministic replay verification | GlobalStateHash comparison |
| A.18 Compliance | Compliance report generation | Programmatic evidence |

## 4. Evidence Generation Protocol

### 4.1 Evidence Types

Each control mapping produces one of these evidence types:

- **Hash Chain Verification** — Proves event store integrity via SHA-256 chain
- **Replay Verification** — Proves deterministic state reconstruction
- **State Bundle Verification** — Proves subsystem hash consistency
- **Governance Verification** — Proves multi-sig quorum enforcement
- **Audit Log Verification** — Proves append-only action recording

### 4.2 Evidence Evaluation

For each control mapping, the evidence generator:

1. Identifies the Attestia subsystem responsible for the control
2. Checks the subsystem's operational state against the control requirement
3. Produces an evidence entry with:
   - `controlId` — Framework control identifier
   - `passed` — Boolean pass/fail
   - `evidenceDetail` — Human-readable explanation with [PASS] or [FAIL] prefix
   - `evidenceType` — One of the evidence types above

### 4.3 Report Structure

```json
{
  "framework": { "id": "soc2-type2", "name": "SOC 2 Type II", "version": "2024" },
  "evaluations": [
    {
      "mapping": { "controlId": "CC1.1", "controlName": "..." },
      "passed": true,
      "evidenceDetail": "[PASS] Event replay produces identical state across 5 replays"
    }
  ],
  "totalControls": 15,
  "passedControls": 14,
  "score": 93.3,
  "generatedAt": "2026-02-11T12:00:00.000Z"
}
```

### 4.4 Scoring

Score = (passedControls / totalControls) * 100, rounded to one decimal place.

## 5. Public Summary

A public compliance summary endpoint exposes:

- Framework ID and name
- Total and implemented control counts
- Aggregate score
- Generation timestamp

The public summary MUST NOT expose:
- Individual control evaluations
- Evidence details
- Internal subsystem names or file paths

## 6. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/compliance/frameworks` | Required | List available compliance frameworks |
| GET | `/api/v1/compliance/report/:frameworkId` | Required | Generate detailed compliance report |
| GET | `/public/v1/compliance/summary` | None | Public compliance summary |

## 7. Implementation

- Framework mappings: `packages/verify/src/compliance/soc2-mapping.ts`, `packages/verify/src/compliance/iso27001-mapping.ts`
- Evidence generator: `packages/verify/src/compliance/evidence-generator.ts`
- API routes: `packages/node/src/routes/compliance.ts`
- Types: `packages/verify/src/compliance/types.ts`

## 8. Security Considerations

- Compliance reports may reveal internal architecture details. The public summary endpoint strips sensitive information.
- Evidence generation is deterministic — same state produces same report.
- Reports are advisory and do not replace formal audit procedures.

## 9. References

- [SOC 2 Trust Service Criteria](https://www.aicpa.org)
- [ISO/IEC 27001:2022](https://www.iso.org)
- RFC-001: Deterministic Event Model
- RFC-004: Global State Hash
