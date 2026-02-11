/**
 * Compliance routes.
 *
 * API routes (auth required):
 *   GET /api/v1/compliance/frameworks           — List available frameworks
 *   GET /api/v1/compliance/report/:frameworkId   — Generate compliance report
 *
 * Public routes (no auth):
 *   GET /public/v1/compliance/summary           — Public compliance summary
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import { createErrorEnvelope } from "../types/error.js";
import {
  SOC2_FRAMEWORK,
  SOC2_MAPPINGS,
  ISO27001_FRAMEWORK,
  ISO27001_MAPPINGS,
  generateComplianceEvidence,
  createStateBundle,
} from "@attestia/verify";
import type { ComplianceFramework, ControlMapping } from "@attestia/verify";

// =============================================================================
// Framework Registry
// =============================================================================

interface FrameworkEntry {
  readonly framework: ComplianceFramework;
  readonly mappings: readonly ControlMapping[];
}

const FRAMEWORK_REGISTRY: ReadonlyMap<string, FrameworkEntry> = new Map([
  ["soc2-type2", { framework: SOC2_FRAMEWORK, mappings: SOC2_MAPPINGS }],
  ["iso27001", { framework: ISO27001_FRAMEWORK, mappings: ISO27001_MAPPINGS }],
]);

// =============================================================================
// API Routes (auth required)
// =============================================================================

export function createComplianceRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // GET /api/v1/compliance/frameworks
  routes.get("/frameworks", (c) => {
    const frameworks = [...FRAMEWORK_REGISTRY.values()].map((entry) => ({
      id: entry.framework.id,
      name: entry.framework.name,
      version: entry.framework.version,
      description: entry.framework.description,
      controlCount: entry.mappings.length,
    }));

    return c.json({ data: frameworks });
  });

  // GET /api/v1/compliance/report/:frameworkId
  routes.get("/report/:frameworkId", (c) => {
    const frameworkId = c.req.param("frameworkId");
    const entry = FRAMEWORK_REGISTRY.get(frameworkId);

    if (entry === undefined) {
      return c.json(
        createErrorEnvelope(
          "NOT_FOUND",
          `Framework '${frameworkId}' not found. Available: ${[...FRAMEWORK_REGISTRY.keys()].join(", ")}`,
        ),
        404,
      );
    }

    // Generate report — optionally with state bundle from the service
    const service = c.get("service");
    let bundle;
    try {
      const snapshot = service.getStateSnapshot();
      const events = service.getAllEventsForExport();
      // Use global positions as event identifiers for hash generation
      const eventHashes = events.map((e) => String(e.globalPosition));
      bundle = createStateBundle(
        snapshot.ledgerSnapshot,
        snapshot.registrumSnapshot,
        eventHashes,
      );
    } catch {
      // If we can't get a bundle, generate report without it
      bundle = undefined;
    }

    const report = generateComplianceEvidence(
      entry.mappings,
      entry.framework,
      bundle,
    );

    return c.json({ data: report });
  });

  return routes;
}

// =============================================================================
// Public Routes (no auth required)
// =============================================================================

export function createPublicComplianceRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // GET /public/v1/compliance/summary
  routes.get("/summary", (c) => {
    const summaries = [...FRAMEWORK_REGISTRY.values()].map((entry) => {
      // Generate without bundle (public endpoint has no service context)
      const report = generateComplianceEvidence(
        entry.mappings,
        entry.framework,
      );

      return {
        framework: {
          id: report.framework.id,
          name: report.framework.name,
          version: report.framework.version,
        },
        totalControls: report.totalControls,
        implementedControls: entry.mappings.filter(
          (m) => m.status === "implemented",
        ).length,
        score: report.score,
        generatedAt: report.generatedAt,
      };
    });

    return c.json({ data: summaries });
  });

  return routes;
}
