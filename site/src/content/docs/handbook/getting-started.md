---
title: Getting Started
description: Install Attestia, run the test suite, and set up XRPL integration testing.
sidebar:
  order: 1
---

This page covers everything you need to get Attestia running locally — from installing dependencies through running the full test suite to standing up a local XRPL node for on-chain integration tests.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** as the package manager (Attestia is a pnpm workspace monorepo)
- **Docker** (required only for XRPL integration testing)

## Installation

Clone the repository and install all workspace dependencies:

```bash
git clone https://github.com/mcp-tool-shop-org/Attestia.git
cd Attestia
pnpm install
```

## Development commands

The monorepo provides top-level scripts that operate across all 14 packages:

| Command | What it does |
|---------|-------------|
| `pnpm install` | Install all dependencies across the workspace |
| `pnpm build` | Build all packages in dependency order |
| `pnpm test` | Run the full test suite (1,853 tests) |
| `pnpm test:coverage` | Run tests with coverage reporting (target: 96.80%) |
| `pnpm typecheck` | Type-check all packages with TypeScript |
| `pnpm bench` | Run performance benchmarks |

A typical development cycle looks like:

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
```

## XRPL integration testing

The witness package (`@attestia/witness`) includes on-chain integration tests that run against a real XRPL ledger. Instead of depending on the public testnet (which requires a faucet and has unpredictable ledger close times), Attestia runs a **standalone rippled node** in Docker.

This gives you:
- **No testnet dependency** — fully self-contained, works offline
- **No faucet needed** — the standalone node pre-funds genesis accounts
- **Sub-second ledger close** — fast, deterministic test cycles

### Running integration tests

```bash
# Start the standalone rippled node
docker compose up -d

# Run on-chain round-trip tests
pnpm --filter @attestia/witness run test:integration

# Tear down when done
docker compose down
```

The integration tests exercise the full attestation round-trip: creating attestation records, submitting them to the XRPL ledger, and verifying on-chain state matches the expected outcome.

## Project structure

Attestia is a monorepo with 14 packages under `packages/`. Each package is independently buildable and testable, but they share common types through `@attestia/types`. The dependency graph flows upward from types through the domain layer (ledger, registrum, vault, treasury) into the integration layer (reconciler, witness, verify) and finally the API surface (node, sdk).

## Next steps

- Read the [Architecture](/Attestia/handbook/architecture/) page to understand the three-tier system
- Review the [Principles](/Attestia/handbook/principles/) to understand the invariants enforced in code
- Check the [Reference](/Attestia/handbook/reference/) for the full package table and documentation index
