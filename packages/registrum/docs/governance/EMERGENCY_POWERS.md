# Emergency Powers

The Constitutional Steward holds limited emergency powers.

These powers exist for system protection, not convenience.

---

## Scope of Emergency Powers

### The Steward MAY

| Action | Condition | Limit |
|--------|-----------|-------|
| Revert a release | Critical defect discovered | Must document retroactively |
| Freeze changes | Security or integrity threat | Temporary only |
| Disable a feature flag | Behavior divergence detected | Must restore or formalize |
| Block a merge | Governance violation detected | Must cite specific rule |
| Expedite a patch | Critical fix required | Class A only |

### The Steward MAY NOT

| Prohibited Action | Reason |
|-------------------|--------|
| Change invariant behavior without proposal | Invariants are constitutional |
| Override replay determinism | Temporal guarantees are absolute |
| Bypass test evidence | Evidence is non-negotiable |
| Approve own Class B/C proposals | Conflict of interest |
| Extend emergency powers permanently | Emergency is temporary by definition |
| Modify governance rules unilaterally | Rules require process |

---

## Emergency Triggers

Emergency powers activate when:

### Integrity Threat

- Parity tests fail unexpectedly
- Replay divergence detected
- Snapshot corruption discovered
- Invariant violation in production

### Security Threat

- Vulnerability in public API
- Unsafe deserialization discovered
- Injection vector found

### Process Violation

- Ungoverned change to governed surface
- Missing decision artifacts
- Evidence falsification

---

## Emergency Procedures

### 1. Revert a Release

**When:** Critical defect discovered post-release

**Process:**
1. Identify defective release
2. Revert to last known good state
3. Notify stakeholders
4. Document in `docs/decisions/` within 48 hours
5. Post-mortem analysis

**Artifact:** Emergency decision record (retroactive)

### 2. Freeze Changes

**When:** Integrity or security threat active

**Process:**
1. Announce freeze
2. Block all merges to main
3. Investigate threat
4. Resolve or escalate
5. Document resolution
6. Lift freeze explicitly

**Duration:** Maximum 7 days without formal extension

**Artifact:** Freeze notice, resolution record

### 3. Disable Feature Flag

**When:** Behavior divergence detected between modes

**Process:**
1. Disable flag (revert to safe default)
2. Investigate divergence
3. Either:
   - Restore flag after fix, OR
   - Formalize as governed change
4. Document decision

**Artifact:** Flag change record

### 4. Block a Merge

**When:** Governance violation in pending change

**Process:**
1. Cite specific governance rule violated
2. Request correction
3. Unblock when compliant
4. Escalate if dispute

**Artifact:** Block reason (in PR/review)

---

## Limitations

### Time Limits

| Action | Maximum Duration |
|--------|------------------|
| Change freeze | 7 days |
| Flag disable | Until resolution |
| Merge block | Until compliance |
| Release revert | Permanent (requires new release) |

### Retroactive Documentation

All emergency actions must be documented within:
- 24 hours: Initial notice
- 48 hours: Decision record
- 7 days: Post-mortem (if applicable)

Undocumented emergency actions are governance violations.

### No Precedent

Emergency actions do not create precedent.
- Each emergency is evaluated independently
- "We did it before" is not justification
- Process must still be followed retroactively

---

## Accountability

### Abuse of Emergency Powers

If emergency powers are used inappropriately:
- Action may be reversed
- Decision must be reviewed
- Steward role may be questioned

### Failure to Use Emergency Powers

If emergency powers should have been used but weren't:
- Damage assessment required
- Process review required
- No automatic penalty (judgment calls are allowed)

---

## Emergency Contact

In case of emergency requiring immediate action:

1. Constitutional Steward (primary)
2. Repository maintainers (secondary, limited to freezes)

No other parties have emergency authority.

---

## Post-Emergency

After any emergency action:

1. **Document** — Create decision record
2. **Analyze** — Determine root cause
3. **Improve** — Update process if needed
4. **Communicate** — Notify stakeholders

Emergency is not complete until documentation is complete.

---

*This document defines emergency powers. Normal operations follow `CHANGE_CLASSES.md`.*
