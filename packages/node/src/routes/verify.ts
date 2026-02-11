/**
 * Verification routes.
 *
 * POST /api/v1/verify/replay — Full replay-based verification
 * POST /api/v1/verify/hash   — Quick hash comparison
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import { ReplayVerifySchema, HashVerifySchema } from "../types/dto.js";
import { validateBody } from "../middleware/validate.js";
import type { ReplayVerifyDto, HashVerifyDto } from "../types/dto.js";

export function createVerifyRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // POST /api/v1/verify/replay
  routes.post("/replay", validateBody(ReplayVerifySchema), (c) => {
    const service = c.get("service");
    const body = c.get("validatedBody") as ReplayVerifyDto;

    const result = service.replayVerify({
      ledgerSnapshot: body.ledgerSnapshot as unknown as Parameters<
        typeof service.replayVerify
      >[0]["ledgerSnapshot"],
      registrumSnapshot: body.registrumSnapshot as unknown as Parameters<
        typeof service.replayVerify
      >[0]["registrumSnapshot"],
      ...(body.expectedHash !== undefined
        ? { expectedHash: body.expectedHash }
        : {}),
    });

    return c.json({ data: result });
  });

  // POST /api/v1/verify/hash
  routes.post("/hash", validateBody(HashVerifySchema), (c) => {
    const service = c.get("service");
    const body = c.get("validatedBody") as HashVerifyDto;

    const result = service.hashVerify(
      body.ledgerSnapshot,
      body.registrumSnapshot,
      body.expectedHash,
    );

    return c.json({ data: result });
  });

  return routes;
}
