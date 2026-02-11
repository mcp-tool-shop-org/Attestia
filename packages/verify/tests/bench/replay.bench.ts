/**
 * Replay verification benchmarks.
 *
 * Measures:
 * - computeGlobalStateHash with realistic snapshots
 * - verifyByReplay roundtrip
 */

import { bench, describe } from "vitest";
import { Ledger } from "@attestia/ledger";
import { StructuralRegistrar, INITIAL_INVARIANTS } from "@attestia/registrum";
import type { Money, LedgerSnapshot } from "@attestia/types";
import type { RegistrarSnapshotV1 } from "@attestia/registrum";
import {
  computeGlobalStateHash,
  verifyByReplay,
} from "../../src/index.js";

function makeLedger(entryCount: number): Ledger {
  const ledger = new Ledger();
  ledger.registerAccount(
    { id: "cash", type: "asset", name: "Cash" },
    "2025-01-01T00:00:00Z",
  );
  ledger.registerAccount(
    { id: "equity", type: "equity", name: "Equity" },
    "2025-01-01T00:00:00Z",
  );

  for (let i = 0; i < entryCount; i++) {
    const money: Money = {
      amount: `${100 + i}.00`,
      currency: "USD",
      decimals: 2,
    };
    const ts = `2025-01-01T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`;
    ledger.append([
      {
        id: `e${i}-d`,
        accountId: "cash",
        type: "debit",
        money,
        timestamp: ts,
        correlationId: `tx-${i}`,
      },
      {
        id: `e${i}-c`,
        accountId: "equity",
        type: "credit",
        money,
        timestamp: ts,
        correlationId: `tx-${i}`,
      },
    ]);
  }
  return ledger;
}

function makeRegistrar(stateCount: number): StructuralRegistrar {
  const registrar = new StructuralRegistrar({
    mode: "legacy",
    invariants: INITIAL_INVARIANTS,
  });
  for (let i = 0; i < stateCount; i++) {
    registrar.register({
      from: null,
      to: { id: `s${i}`, structure: { isRoot: true }, data: null },
    });
  }
  return registrar;
}

describe("computeGlobalStateHash", () => {
  bench("with 100 ledger entries", () => {
    const ledger = makeLedger(100);
    const registrar = makeRegistrar(20);
    computeGlobalStateHash(ledger.snapshot(), registrar.snapshot());
  });

  bench("with 10 ledger entries", () => {
    const ledger = makeLedger(10);
    const registrar = makeRegistrar(5);
    computeGlobalStateHash(ledger.snapshot(), registrar.snapshot());
  });
});

describe("verifyByReplay", () => {
  let ledgerSnapshot100: LedgerSnapshot;
  let registrumSnapshot20: RegistrarSnapshotV1;
  let hash100: string;

  let ledgerSnapshot10: LedgerSnapshot;
  let registrumSnapshot5: RegistrarSnapshotV1;
  let hash10: string;

  bench(
    "roundtrip with 100 entries",
    () => {
      verifyByReplay({
        ledgerSnapshot: ledgerSnapshot100,
        registrumSnapshot: registrumSnapshot20,
        expectedHash: hash100,
      });
    },
    {
      setup() {
        const ledger = makeLedger(100);
        const registrar = makeRegistrar(20);
        ledgerSnapshot100 = ledger.snapshot();
        registrumSnapshot20 = registrar.snapshot();
        hash100 = computeGlobalStateHash(ledgerSnapshot100, registrumSnapshot20).hash;
      },
    },
  );

  bench(
    "roundtrip with 10 entries",
    () => {
      verifyByReplay({
        ledgerSnapshot: ledgerSnapshot10,
        registrumSnapshot: registrumSnapshot5,
        expectedHash: hash10,
      });
    },
    {
      setup() {
        const ledger = makeLedger(10);
        const registrar = makeRegistrar(5);
        ledgerSnapshot10 = ledger.snapshot();
        registrumSnapshot5 = registrar.snapshot();
        hash10 = computeGlobalStateHash(ledgerSnapshot10, registrumSnapshot5).hash;
      },
    },
  );
});
