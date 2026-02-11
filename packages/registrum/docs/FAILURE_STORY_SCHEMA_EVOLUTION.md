# A Failure Registrum Refuses

*Schema Evolution Without Accountability*

---

## The Familiar Failure

A system stores user records using a schema:

```json
{
  "user_id": "string",
  "email": "string",
  "created_at": "timestamp"
}
```

Over time, requirements change.
A new field is added:

```json
{
  "user_id": "string",
  "email": "string",
  "created_at": "timestamp",
  "account_status": "string"
}
```

Old data remains.
New code is deployed.

Everything still runs.

---

## Why This Failure Is Dangerous

No single moment is clearly wrong.

- Reads still succeed.
- Writes still succeed.
- Migrations are partial.
- Some code assumes the new field exists.
- Other code silently defaults.

Weeks later:

- Reports disagree.
- Access control behaves inconsistently.
- No one can point to *when* the system became invalid.

There is no audit trail that says:
> "This transition should not have occurred."

---

## Where Registrum Intervenes

With Registrum, the schema change is a **state transition**.

When the new schema is registered, Registrum evaluates:

| Check | Question |
|-------|----------|
| **Identity** | Is this still the same structural entity? |
| **Lineage** | Does this state derive lawfully from its predecessor? |
| **Ordering** | Is this transition occurring in a valid sequence? |

At the moment the new schema is introduced without a lawful lineage relationship, Registrum **refuses**.

---

## The Refusal

Registrum halts registration and returns a verdict:

```json
{
  "type": "InvariantViolation",
  "invariant": "lineage-continuity",
  "classification": "HARD",
  "reason": "Schema introduces new required field without declared lineage from prior state",
  "from": "Schema@v1",
  "to": "Schema@v2"
}
```

**No recovery is attempted.**
**No defaulting occurs.**
**No migration is inferred.**

The system stops before ambiguity enters history.

---

## What Becomes Newly Possible

Because the refusal is explicit:

| Property | Outcome |
|----------|---------|
| **Timing** | The exact moment of violation is known |
| **Responsibility** | Clear assignment possible |
| **Replay** | The system can be replayed to this point |
| **Verification** | Independent parties can verify the refusal |
| **Memory** | Institutional memory is preserved |

Most importantly:

> **The system never enters a state it cannot later explain.**

---

## What Registrum Does Not Do

| ❌ Does Not | Why |
|-------------|-----|
| Infer migrations | Would require semantic interpretation |
| Suggest fixes | Would imply judgment |
| Allow with warning | Would permit ambiguity |
| Retry automatically | Would hide the violation |

Registrum's value is in what it refuses to do.

---

## The Point

Registrum does not prevent change.
It prevents **unaccountable change**.

It does not help you move fast.
It tells you when you are **no longer allowed to move**.

---

## The Alternative

Without Registrum, the failure mode is:

1. Change happens
2. Some data is old, some is new
3. Behavior diverges silently
4. Months later, someone notices
5. No one can explain when it started
6. Institutional trust erodes

With Registrum, the failure mode is:

1. Change is proposed
2. Registrum refuses
3. The exact reason is recorded
4. The transition never enters history
5. The system remains explicable

---

## Closing

This is not a bug report.
This is an example of **success**.

Registrum succeeded by refusing.

The refusal is the product.

---

*This document illustrates a failure Registrum is designed to prevent.*
*It is part of Phase J: making correctness legible to outsiders.*
