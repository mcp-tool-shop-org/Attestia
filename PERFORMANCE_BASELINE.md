# Performance Baseline

Recorded: 2026-02-11
Node.js: v22.21.1
Vitest: 1.6.1 (bench via tinybench)
Platform: Windows 11, x64
Hardware: Desktop workstation

## Event Store (`@attestia/event-store`)

| Benchmark | Hz (ops/sec) | p50 (ms) | p99 (ms) |
|-----------|-------------|----------|----------|
| InMemory: append 100 single events | ~2,010 | 0.50 | 0.72 |
| InMemory: append batch of 100 events | ~2,140 | 0.47 | 0.78 |
| InMemory: read 1K events from stream | ~408,623 | 0.002 | 0.004 |
| JSONL: append 100 single events | ~15 | 66.3 | 79.3 |
| JSONL: append batch of 100 events | ~131 | 7.6 | 15.6 |
| Hash chain: verify 1K events | ~254 | 3.9 | 5.2 |
| Hash chain: verify 100 events | ~2,763 | 0.36 | 0.62 |

## Verify (`@attestia/verify`)

| Benchmark | Hz (ops/sec) | p50 (ms) | p99 (ms) |
|-----------|-------------|----------|----------|
| computeGlobalStateHash (100 entries) | ~1,510 | 0.66 | 1.11 |
| computeGlobalStateHash (10 entries) | ~13,090 | 0.08 | 0.21 |
| verifyByReplay (100 entries) | ~452 | 2.21 | 2.81 |
| verifyByReplay (10 entries) | ~4,442 | 0.23 | 0.40 |

## HTTP API (`@attestia/node`)

| Benchmark | Hz (ops/sec) | p50 (ms) | p99 (ms) |
|-----------|-------------|----------|----------|
| Health check | ~6,637 | 0.15 | 1.33 |
| List intents (empty) | ~5,856 | 0.17 | 1.48 |
| Declare intent | ~3,382 | 0.30 | 1.94 |
| Declare + parse response | ~4,642 | 0.22 | 1.68 |

## Notes

- All benchmarks run via `vitest bench` (experimental in v1.x).
- Multi-step async lifecycle benchmarks are excluded due to vitest bench async scheduling limitations (tinybench). Correctness of multi-step flows is covered by `payroll-lifecycle.test.ts`.
- JSONL benchmarks include filesystem I/O (fsync). Numbers vary with disk speed.
- In-memory read performance reflects array slice — effectively O(1) overhead.
- Hash chain verification scales linearly with event count (~3.9ms per 1K events).
- `verifyByReplay` includes full snapshot→restore→snapshot→hash cycle for both ledger and registrum.

## Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Health check latency p99 | < 5ms | ~1.3ms |
| Declare intent p99 | < 10ms | ~1.9ms |
| Hash chain verify 1K events | < 20ms | ~3.9ms |
| Replay verify 100 entries | < 10ms | ~2.2ms |
| GlobalStateHash 100 entries | < 5ms | ~0.66ms |

All targets met.

## Running Benchmarks

```bash
# All packages
pnpm bench

# Individual packages
pnpm --filter @attestia/event-store bench
pnpm --filter @attestia/verify bench
pnpm --filter @attestia/node bench
```
