/**
 * Intent lifecycle benchmarks.
 *
 * Measures:
 * - Declare intent throughput (fire-and-forget)
 * - Declare intent + read response throughput
 * - List intents throughput (read path)
 *
 * Note: Multi-step lifecycle benchmarks (declare → approve → execute)
 * are excluded due to tinybench async iteration limitations in vitest 1.x.
 * The pilot lifecycle test covers correctness; these measure throughput.
 */

import { bench, describe } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";

describe("intent lifecycle", () => {
  bench("declare intent", async () => {
    const { app } = createTestApp();
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        type: "payment",
        params: {
          fromAddress: "0xBenchSender",
          toAddress: "0xBenchReceiver",
          amount: { amount: "1000", currency: "USDC", decimals: 6 },
        },
      }),
    );
  });

  bench("declare and parse response", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        type: "payment",
        params: {
          fromAddress: "0xBenchSender",
          toAddress: "0xBenchReceiver",
          amount: { amount: "5000", currency: "USDC", decimals: 6 },
        },
      }),
    );
    await res.json();
  });

  bench("list intents (empty)", async () => {
    const { app } = createTestApp();
    await app.request(jsonRequest("/api/v1/intents", "GET"));
  });

  bench("health check", async () => {
    const { app } = createTestApp();
    await app.request(new Request("http://localhost/health"));
  });
});
