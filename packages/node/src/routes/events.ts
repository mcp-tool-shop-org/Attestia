/**
 * Event query routes.
 *
 * GET /api/v1/events            — List all events (cursor pagination)
 * GET /api/v1/events/:streamId  — List events for a stream
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import { paginate } from "../types/pagination.js";
import { ListEventsQuerySchema, ListStreamEventsQuerySchema } from "../types/dto.js";
import { createErrorEnvelope } from "../types/error.js";

export function createEventRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // GET /api/v1/events — All events
  routes.get("/", (c) => {
    const service = c.get("service");

    const queryResult = ListEventsQuerySchema.safeParse(c.req.query());
    if (!queryResult.success) {
      return c.json(
        createErrorEnvelope("VALIDATION_ERROR", "Invalid query parameters"),
        400,
      );
    }

    const query = queryResult.data;
    const events = service.readAllEvents(
      query.afterPosition !== undefined
        ? { fromPosition: query.afterPosition + 1 }
        : undefined,
    );

    const result = paginate(
      [...events],
      { cursor: query.cursor, limit: query.limit },
      (e) => String(e.globalPosition),
      "globalPosition",
    );

    return c.json(result);
  });

  // GET /api/v1/events/:streamId
  routes.get("/:streamId", (c) => {
    const service = c.get("service");
    const streamId = c.req.param("streamId");

    const queryResult = ListStreamEventsQuerySchema.safeParse(c.req.query());
    if (!queryResult.success) {
      return c.json(
        createErrorEnvelope("VALIDATION_ERROR", "Invalid query parameters"),
        400,
      );
    }

    const query = queryResult.data;
    const events = service.readStreamEvents(
      streamId,
      query.afterVersion !== undefined
        ? { fromVersion: query.afterVersion + 1 }
        : undefined,
    );

    const result = paginate(
      [...events],
      { cursor: query.cursor, limit: query.limit },
      (e) => String(e.version),
      "version",
    );

    return c.json(result);
  });

  return routes;
}
