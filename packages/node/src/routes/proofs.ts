/**
 * Proof generation and verification routes.
 *
 * API routes (auth required):
 *   GET  /api/v1/proofs/attestation/:id — Generate proof package for attestation
 *   GET  /api/v1/proofs/merkle-root     — Current Merkle root of attestation hashes
 *   POST /api/v1/proofs/verify          — Verify a submitted proof package
 *
 * Public routes (no auth):
 *   POST /public/v1/proofs/verify       — Public proof verification
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../types/api-contract.js";
import { createErrorEnvelope } from "../types/error.js";
import { validateBody } from "../middleware/validate.js";
import {
  MerkleTree,
  packageAttestationProof,
  verifyAttestationProof,
} from "@attestia/proof";
import type { AttestationProofPackage } from "@attestia/proof";

// =============================================================================
// Zod Schemas
// =============================================================================

const MerkleProofStepSchema = z.object({
  hash: z.string().length(64),
  direction: z.enum(["left", "right"]),
});

const MerkleProofSchema = z.object({
  leafHash: z.string().length(64),
  leafIndex: z.number().int().min(0),
  siblings: z.array(MerkleProofStepSchema),
  root: z.string().length(64),
});

const ProofPackageSchema = z.object({
  version: z.literal(1),
  attestation: z.unknown(),
  attestationHash: z.string().length(64),
  merkleRoot: z.string().length(64),
  inclusionProof: MerkleProofSchema,
  packagedAt: z.string(),
  packageHash: z.string().length(64),
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a Merkle tree from the attestation records in a service.
 * Uses reportHash from each attestation as leaves (ordered by attestedAt).
 */
function buildAttestationTree(service: {
  listAttestations(): readonly { reportHash: string }[];
}): { tree: MerkleTree; hashes: string[] } {
  const attestations = service.listAttestations();
  const hashes = attestations.map((a) => a.reportHash);
  const tree = MerkleTree.build(hashes);
  return { tree, hashes };
}

// =============================================================================
// API Routes (auth required)
// =============================================================================

export function createProofRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // GET /api/v1/proofs/merkle-root
  routes.get("/merkle-root", (c) => {
    const service = c.get("service");
    const { tree, hashes } = buildAttestationTree(service);
    const root = tree.getRoot();

    return c.json({
      data: {
        merkleRoot: root,
        leafCount: hashes.length,
        computedAt: new Date().toISOString(),
      },
    });
  });

  // GET /api/v1/proofs/attestation/:id
  routes.get("/attestation/:id", (c) => {
    const attestationId = c.req.param("id");
    const service = c.get("service");

    const attestations = service.listAttestations();
    const index = attestations.findIndex((a) => a.id === attestationId);

    if (index === -1) {
      return c.json(
        createErrorEnvelope(
          "NOT_FOUND",
          `Attestation '${attestationId}' not found`,
        ),
        404,
      );
    }

    const attestation = attestations[index]!;
    const hashes = attestations.map((a) => a.reportHash);
    const tree = MerkleTree.build(hashes);

    const pkg = packageAttestationProof(attestation, hashes, tree, index);

    if (pkg === null) {
      return c.json(
        createErrorEnvelope(
          "INTERNAL_ERROR",
          "Failed to generate proof package",
        ),
        500,
      );
    }

    return c.json({ data: pkg });
  });

  // POST /api/v1/proofs/verify
  routes.post("/verify", validateBody(ProofPackageSchema), (c) => {
    const pkg = c.get("validatedBody") as AttestationProofPackage;
    const valid = verifyAttestationProof(pkg);

    return c.json({
      data: {
        valid,
        verifiedAt: new Date().toISOString(),
      },
    });
  });

  return routes;
}

// =============================================================================
// Public Routes (no auth required)
// =============================================================================

export function createPublicProofRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // POST /public/v1/proofs/verify
  routes.post("/verify", validateBody(ProofPackageSchema), (c) => {
    const pkg = c.get("validatedBody") as AttestationProofPackage;
    const valid = verifyAttestationProof(pkg);

    return c.json({
      data: {
        valid,
        verifiedAt: new Date().toISOString(),
      },
    });
  });

  return routes;
}
