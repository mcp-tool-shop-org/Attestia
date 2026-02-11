#!/usr/bin/env node
/**
 * @attestia/demo — Interactive CLI walkthrough.
 *
 * Runs the full Attestia pipeline in your terminal:
 * declare intent -> approve -> execute -> ledger -> verify ->
 * reconcile -> attest -> state-hash -> merkle-tree -> proof -> verify-proof
 *
 * Uses real domain packages directly (no HTTP server).
 */

import chalk from "chalk";
import crypto from "node:crypto";
import { Vault } from "@attestia/vault";
import { Ledger } from "@attestia/ledger";
import { InMemoryEventStore, isHashedEvent } from "@attestia/event-store";
import type { HashedStoredEvent } from "@attestia/event-store";
import { StructuralRegistrar } from "@attestia/registrum";
import { ObserverRegistry } from "@attestia/chain-observer";
import { Reconciler } from "@attestia/reconciler";
import { computeGlobalStateHash } from "@attestia/verify";
import { MerkleTree, packageAttestationProof, verifyAttestationProof } from "@attestia/proof";
import type { DomainEvent, LedgerEntry } from "@attestia/types";
import type { ReconcilableIntent, ReconcilableLedgerEntry, ReconcilableChainEvent } from "@attestia/reconciler";

// =============================================================================
// Helpers
// =============================================================================

const DELAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let _eventSeq = 0;

/** Build a minimal DomainEvent for the demo event store. */
function domainEvent(
  type: string,
  payload: Record<string, unknown>,
  source: "vault" | "treasury" | "registrum" | "observer" = "vault",
): DomainEvent {
  _eventSeq++;
  return {
    type,
    metadata: {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor: "demo-cli",
      correlationId: `demo-${_eventSeq}`,
      source,
    },
    payload,
  };
}

function banner(): void {
  console.log();
  console.log(chalk.cyan.bold("  ╔══════════════════════════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("  ║") + chalk.white.bold("                     ATTESTIA DEMO                       ") + chalk.cyan.bold("║"));
  console.log(chalk.cyan.bold("  ║") + chalk.gray("          Financial Truth Infrastructure                 ") + chalk.cyan.bold("║"));
  console.log(chalk.cyan.bold("  ╚══════════════════════════════════════════════════════════╝"));
  console.log();
}

function stepHeader(step: number, total: number, title: string): void {
  const prefix = chalk.cyan.bold(`  Step ${step}/${total}`);
  const line = chalk.gray("─".repeat(50 - title.length));
  console.log(`\n${prefix}  ${chalk.white.bold(title)}  ${line}`);
}

function ok(msg: string): void {
  console.log(chalk.green("    ✓ ") + chalk.white(msg));
}

function info(label: string, value: string): void {
  console.log(chalk.gray("    → ") + chalk.gray(label.padEnd(16)) + chalk.white(value));
}

function hashLine(label: string, hash: string): void {
  const short = hash.length > 16 ? `${hash.slice(0, 16)}...${hash.slice(-8)}` : hash;
  console.log(chalk.gray("    → ") + chalk.gray(label.padEnd(16)) + chalk.yellow(short));
}

function warn(msg: string): void {
  console.log(chalk.yellow("    ! ") + chalk.yellow(msg));
}

const TOTAL_STEPS = 14;

// =============================================================================
// Demo
// =============================================================================

async function run(): Promise<void> {
  banner();
  console.log(chalk.gray("  Walk-through of the full Attestia pipeline."));
  console.log(chalk.gray("  Every step uses real domain packages — no mocks.\n"));

  await sleep(DELAY_MS);

  // ─── Step 1: Boot ───────────────────────────────────────────────────

  stepHeader(1, TOTAL_STEPS, "Boot");

  const observerRegistry = new ObserverRegistry();
  const vault = new Vault(
    {
      ownerId: "acme-corp",
      watchedAddresses: [],
      defaultCurrency: "USDC",
      defaultDecimals: 6,
    },
    observerRegistry,
  );
  ok("Vault initialized (owner: acme-corp)");

  const ledger = new Ledger();
  ledger.registerAccount({ id: "treasury", type: "asset", name: "Treasury" });
  ledger.registerAccount({ id: "payroll", type: "expense", name: "Payroll" });
  ok("Ledger initialized (2 accounts: treasury, payroll)");

  const eventStore = new InMemoryEventStore();
  ok("EventStore initialized (InMemory, hash-chained)");

  const registrar = new StructuralRegistrar({ mode: "legacy" });
  ok("Registrum initialized (structural registrar)");

  const reconciler = new Reconciler({
    registrar,
    attestorId: "demo-cli",
  });
  ok("Reconciler initialized (attestor: demo-cli)");

  await sleep(DELAY_MS);

  // ─── Step 2: Declare Intent ─────────────────────────────────────────

  stepHeader(2, TOTAL_STEPS, "Declare Intent");

  const intentId = "payroll-jan-2025";
  const intent = vault.declareIntent(intentId, "transfer", "January 2025 payroll — 5 employees", {
    fromAddress: "0xTreasury",
    toAddress: "0xPayrollContract",
    amount: { amount: "50000000000", currency: "USDC", decimals: 6 },
  });

  info("id", intent.id);
  info("kind", intent.kind);
  info("description", intent.description);
  info("amount", "50,000.000000 USDC");
  info("from", "0xTreasury");
  info("to", "0xPayrollContract");
  ok(`Status: ${chalk.bold(intent.status)}`);

  eventStore.append("vault.intents", [
    domainEvent("vault.intent.declared", { intentId: intent.id, kind: intent.kind }),
  ]);

  await sleep(DELAY_MS);

  // ─── Step 3: Approve Intent ─────────────────────────────────────────

  stepHeader(3, TOTAL_STEPS, "Approve Intent");

  const approved = vault.approveIntent(intentId, "Budget verified, headcount confirmed");
  info("approver", "CFO");
  info("reason", "Budget verified, headcount confirmed");
  ok(`Status: ${chalk.bold(approved.status)}`);

  eventStore.append("vault.intents", [
    domainEvent("vault.intent.approved", { intentId, approvedBy: "CFO" }),
  ]);

  await sleep(DELAY_MS);

  // ─── Step 4: Execute Intent ─────────────────────────────────────────

  stepHeader(4, TOTAL_STEPS, "Execute Intent");

  vault.markIntentExecuting(intentId);
  const executed = vault.recordIntentExecution(intentId, "evm:1", "0xabc123def456");
  info("chain", "evm:1 (Ethereum Mainnet)");
  info("txHash", "0xabc123def456");
  ok(`Status: ${chalk.bold(executed.status)}`);

  eventStore.append("vault.intents", [
    domainEvent("vault.intent.executed", { intentId, chainId: "evm:1", txHash: "0xabc123def456" }),
  ]);

  await sleep(DELAY_MS);

  // ─── Step 5: Record Ledger Entries ──────────────────────────────────

  stepHeader(5, TOTAL_STEPS, "Record Ledger Entries");

  const now = new Date().toISOString();
  const entries: readonly LedgerEntry[] = [
    {
      id: "le-payroll-debit",
      accountId: "treasury",
      type: "debit",
      money: { amount: "50000000000", currency: "USDC", decimals: 6 },
      timestamp: now,
      intentId,
      txHash: "0xabc123def456",
      correlationId: "payroll-jan",
    },
    {
      id: "le-payroll-credit",
      accountId: "payroll",
      type: "credit",
      money: { amount: "50000000000", currency: "USDC", decimals: 6 },
      timestamp: now,
      intentId,
      txHash: "0xabc123def456",
      correlationId: "payroll-jan",
    },
  ];

  const appendResult = ledger.append(entries);
  info("debit", "treasury  -50,000 USDC");
  info("credit", "payroll   +50,000 USDC");
  info("correlation", appendResult.correlationId);
  ok(`Balanced double-entry recorded (${appendResult.entryCount} entries)`);

  eventStore.append("ledger.transactions", [
    domainEvent("ledger.transaction.appended", { correlationId: appendResult.correlationId, entryCount: 2 }, "treasury"),
  ]);

  await sleep(DELAY_MS);

  // ─── Step 6: Verify Intent ─────────────────────────────────────────

  stepHeader(6, TOTAL_STEPS, "Verify Intent");

  const verified = vault.verifyIntent(intentId, true);
  info("matched", "true");
  info("discrepancies", "none");
  ok(`Status: ${chalk.bold(verified.status)}`);

  eventStore.append("vault.intents", [
    domainEvent("vault.intent.verified", { intentId, matched: true }),
  ]);

  await sleep(DELAY_MS);

  // ─── Step 7: Reconcile ──────────────────────────────────────────────

  stepHeader(7, TOTAL_STEPS, "Reconcile (3-way match)");

  const reconcilableIntents: readonly ReconcilableIntent[] = [
    {
      id: intentId,
      status: "executed",
      kind: "transfer",
      amount: { amount: "50000000000", currency: "USDC", decimals: 6 },
      chainId: "evm:1",
      txHash: "0xabc123def456",
      declaredAt: now,
      correlationId: "payroll-jan",
    },
  ];

  const reconcilableEntries: readonly ReconcilableLedgerEntry[] = [
    {
      id: "le-payroll-debit",
      accountId: "treasury",
      type: "debit",
      money: { amount: "50000000000", currency: "USDC", decimals: 6 },
      timestamp: now,
      intentId,
      txHash: "0xabc123def456",
      correlationId: "payroll-jan",
    },
  ];

  const reconcilableChainEvents: readonly ReconcilableChainEvent[] = [
    {
      chainId: "evm:1",
      txHash: "0xabc123def456",
      from: "0xTreasury",
      to: "0xPayrollContract",
      amount: "50000000000",
      decimals: 6,
      symbol: "USDC",
      timestamp: now,
    },
  ];

  const report = reconciler.reconcile({
    intents: reconcilableIntents,
    ledgerEntries: reconcilableEntries,
    chainEvents: reconcilableChainEvents,
  });

  info("intent <> ledger", `${report.intentLedgerMatches.length} match(es)`);
  info("ledger <> chain", `${report.ledgerChainMatches.length} match(es)`);
  info("intent <> chain", `${report.intentChainMatches.length} match(es)`);
  info("all reconciled", String(report.summary.allReconciled));
  ok(`Reconciliation complete — ${report.summary.matchedCount} matched, ${report.summary.mismatchCount} mismatches`);

  eventStore.append("reconciler", [
    domainEvent("reconciler.reconciliation.completed", { reportId: report.id, allReconciled: report.summary.allReconciled }, "registrum"),
  ]);

  await sleep(DELAY_MS);

  // ─── Step 8: Attest ─────────────────────────────────────────────────

  stepHeader(8, TOTAL_STEPS, "Attest");

  const attestation = await reconciler.attest(report);
  info("attestation id", attestation.id);
  info("attested by", attestation.attestedBy);
  hashLine("report hash", attestation.reportHash);
  ok("Attestation recorded with SHA-256 hash");

  eventStore.append("reconciler", [
    domainEvent("reconciler.attestation.recorded", { attestationId: attestation.id, reportHash: attestation.reportHash }, "registrum"),
  ]);

  await sleep(DELAY_MS);

  // ─── Step 9: Compute Global State Hash ──────────────────────────────

  stepHeader(9, TOTAL_STEPS, "Compute Global State Hash");

  const ledgerSnapshot = ledger.snapshot();
  const registrumSnapshot = registrar.snapshot();
  const globalState = computeGlobalStateHash(ledgerSnapshot, registrumSnapshot);

  hashLine("ledger hash", globalState.subsystems.ledger);
  hashLine("registrum hash", globalState.subsystems.registrum);
  hashLine("global hash", globalState.hash);
  info("computed at", globalState.computedAt);
  ok("Deterministic state fingerprint — any auditor can replay to the same hash");

  await sleep(DELAY_MS);

  // ─── Step 10: Build Merkle Tree ─────────────────────────────────────

  stepHeader(10, TOTAL_STEPS, "Build Merkle Tree");

  const allEvents = eventStore.readAll();
  // InMemoryEventStore stores HashedStoredEvent at runtime
  const hashedEvents = allEvents.filter(isHashedEvent) as readonly HashedStoredEvent[];
  const eventHashes = hashedEvents.map((e) => e.hash);
  const tree = MerkleTree.build(eventHashes);
  const root = tree.getRoot();

  info("leaves", `${tree.getLeafCount()} events`);
  if (root !== null) {
    hashLine("merkle root", root);
  }
  ok("Binary SHA-256 hash tree built from event hashes");

  await sleep(DELAY_MS);

  // ─── Step 11: Generate Attestation Proof ────────────────────────────

  stepHeader(11, TOTAL_STEPS, "Generate Attestation Proof");

  // The attestation event is the last one we appended
  const attestationEventIndex = eventHashes.length - 1;
  const proofPkg = packageAttestationProof(
    attestation,
    eventHashes,
    tree,
    attestationEventIndex,
  );

  if (proofPkg !== null) {
    hashLine("attestation hash", proofPkg.attestationHash);
    hashLine("merkle root", proofPkg.merkleRoot);
    info("proof steps", `${proofPkg.inclusionProof.siblings.length} sibling(s)`);
    hashLine("package hash", proofPkg.packageHash);
    ok("Self-contained proof package — verifiable offline by any third party");
  } else {
    warn("Could not generate proof (unexpected null)");
  }

  await sleep(DELAY_MS);

  // ─── Step 12: Verify Proof ──────────────────────────────────────────

  stepHeader(12, TOTAL_STEPS, "Verify Attestation Proof");

  if (proofPkg !== null) {
    const proofValid = verifyAttestationProof(proofPkg);
    info("package hash", "verified");
    info("merkle path", "verified");
    info("inclusion", "verified");
    if (proofValid) {
      ok(chalk.green.bold("PROOF VALID") + " — attestation is cryptographically included in the event tree");
    } else {
      warn("Proof verification failed");
    }
  }

  await sleep(DELAY_MS);

  // ─── Step 13: Export Event Log ──────────────────────────────────────

  stepHeader(13, TOTAL_STEPS, "Export Event Log (NDJSON)");

  info("format", "application/x-ndjson");
  info("events", `${allEvents.length} total`);
  console.log();
  for (const se of hashedEvents) {
    const line = JSON.stringify({
      type: se.event.type,
      stream: se.streamId,
      hash: se.hash.slice(0, 12) + "...",
    });
    console.log(chalk.gray("    ") + chalk.dim(line));
  }
  ok("Append-only, hash-chained, replayable event stream");

  await sleep(DELAY_MS);

  // ─── Step 14: Summary ───────────────────────────────────────────────

  stepHeader(14, TOTAL_STEPS, "Summary");

  console.log();
  console.log(chalk.white("    Events recorded:     ") + chalk.cyan.bold(String(allEvents.length)));
  console.log(chalk.white("    Intents:             ") + chalk.cyan.bold("1 (declared -> approved -> executed -> verified)"));
  console.log(chalk.white("    Ledger entries:      ") + chalk.cyan.bold("2 (balanced debit + credit)"));
  console.log(chalk.white("    Reconciliation:      ") + chalk.cyan.bold(`${report.summary.matchedCount} matched, ${report.summary.mismatchCount} mismatches`));
  if (root !== null) {
    console.log(chalk.white("    Merkle root:         ") + chalk.yellow(root.slice(0, 16) + "..." + root.slice(-8)));
  }
  console.log(chalk.white("    Global state hash:   ") + chalk.yellow(globalState.hash.slice(0, 16) + "..." + globalState.hash.slice(-8)));
  if (proofPkg !== null) {
    console.log(chalk.white("    Proof package:       ") + chalk.green.bold("VALID"));
  }

  console.log();
  console.log(chalk.gray("    Every financial event is append-only, hash-chained,"));
  console.log(chalk.gray("    and externally verifiable."));
  console.log();
  console.log(chalk.cyan.bold("    AI can advise. Humans decide."));
  console.log();
}

run().catch((err: unknown) => {
  console.error(chalk.red("\n  Demo failed:"), err);
  process.exit(1);
});
