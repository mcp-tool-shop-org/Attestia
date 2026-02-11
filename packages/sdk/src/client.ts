/**
 * @attestia/sdk — Attestia Client.
 *
 * Main entry point for the Attestia SDK.
 *
 * Provides typed methods for:
 * - Intent lifecycle (declare, approve, reject, execute, verify)
 * - Verification (state hash, replay)
 * - Proof operations (get attestation proof, verify proof)
 *
 * Design:
 * - Delegates to HttpClient for transport
 * - Namespace grouping: client.intents, client.verify, client.proofs
 * - All methods return typed responses
 * - Pagination via cursor strings
 */

import type { AttestiaClientConfig, AttestiaResponse, PaginatedList } from "./types.js";
import { HttpClient } from "./http-client.js";

// =============================================================================
// Domain Types (SDK-specific; mirrors the server types)
// =============================================================================

/**
 * Intent status values as returned by the API.
 */
export type IntentStatus =
  | "declared"
  | "approved"
  | "rejected"
  | "executing"
  | "executed"
  | "verified"
  | "failed";

/**
 * Money amount representation.
 */
export interface Money {
  readonly amount: string;
  readonly currency: string;
  readonly decimals: number;
}

/**
 * Intent parameters.
 */
export interface IntentParams {
  readonly fromChainId?: string | undefined;
  readonly toChainId?: string | undefined;
  readonly fromAddress?: string | undefined;
  readonly toAddress?: string | undefined;
  readonly amount?: Money | undefined;
  readonly receiveToken?: string | undefined;
  readonly extra?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Intent kind values.
 */
export type IntentKind =
  | "transfer"
  | "swap"
  | "allocate"
  | "deallocate"
  | "bridge"
  | "stake"
  | "unstake";

/**
 * Intent as returned by the API.
 */
export interface Intent {
  readonly id: string;
  readonly status: IntentStatus;
  readonly kind: IntentKind;
  readonly description: string;
  readonly declaredBy: string;
  readonly declaredAt: string;
  readonly params: IntentParams;
}

/**
 * Parameters for declaring a new intent.
 */
export interface DeclareIntentParams {
  readonly id: string;
  readonly kind: IntentKind;
  readonly description: string;
  readonly params: IntentParams;
  readonly envelopeId?: string | undefined;
}

/**
 * Parameters for listing intents.
 */
export interface ListIntentsParams {
  readonly cursor?: string | undefined;
  readonly limit?: number | undefined;
  readonly status?: IntentStatus | undefined;
}

/**
 * Global state hash response.
 */
export interface GlobalStateHash {
  readonly hash: string;
  readonly computedAt: string;
}

/**
 * Replay verification input.
 */
export interface ReplayInput {
  readonly ledgerSnapshot: Record<string, unknown>;
  readonly registrumSnapshot: Record<string, unknown>;
  readonly expectedHash?: string | undefined;
}

/**
 * Replay verification result.
 */
export interface ReplayResult {
  readonly match: boolean;
  readonly computedHash: string;
  readonly expectedHash: string;
  readonly details: Record<string, unknown>;
}

/**
 * Merkle proof step.
 */
export interface MerkleProofStep {
  readonly hash: string;
  readonly direction: "left" | "right";
}

/**
 * Attestation proof package (self-contained, portable).
 */
export interface AttestationProofPackage {
  readonly version: 1;
  readonly attestation: unknown;
  readonly attestationHash: string;
  readonly merkleRoot: string;
  readonly inclusionProof: {
    readonly leafHash: string;
    readonly leafIndex: number;
    readonly siblings: readonly MerkleProofStep[];
    readonly root: string;
  };
  readonly packagedAt: string;
  readonly packageHash: string;
}

/**
 * Proof verification result.
 */
export interface ProofVerificationResult {
  readonly valid: boolean;
  readonly verifiedAt: string;
}

/**
 * Merkle root response.
 */
export interface MerkleRootInfo {
  readonly merkleRoot: string;
  readonly leafCount: number;
  readonly computedAt: string;
}

// =============================================================================
// Namespace Classes
// =============================================================================

/**
 * Intent operations namespace.
 */
export class IntentsNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Declare a new intent.
   */
  async declare(params: DeclareIntentParams): Promise<AttestiaResponse<Intent>> {
    const result = await this.http.post<Intent>("/api/v1/intents", params);
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Get a single intent by ID.
   */
  async get(id: string): Promise<AttestiaResponse<Intent>> {
    const result = await this.http.get<Intent>(`/api/v1/intents/${encodeURIComponent(id)}`);
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * List intents with cursor pagination.
   */
  async list(params?: ListIntentsParams): Promise<AttestiaResponse<PaginatedList<Intent>>> {
    const query = new URLSearchParams();
    if (params?.cursor !== undefined) query.set("cursor", params.cursor);
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.status !== undefined) query.set("status", params.status);

    const qs = query.toString();
    const path = qs.length > 0 ? `/api/v1/intents?${qs}` : "/api/v1/intents";

    const result = await this.http.get<PaginatedList<Intent>>(path);
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Approve an intent.
   */
  async approve(id: string, reason?: string): Promise<AttestiaResponse<Intent>> {
    const body = reason !== undefined ? { reason } : {};
    const result = await this.http.post<Intent>(
      `/api/v1/intents/${encodeURIComponent(id)}/approve`,
      body,
    );
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Reject an intent with a required reason.
   */
  async reject(id: string, reason: string): Promise<AttestiaResponse<Intent>> {
    const result = await this.http.post<Intent>(
      `/api/v1/intents/${encodeURIComponent(id)}/reject`,
      { reason },
    );
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Mark an intent as executed with chain details.
   */
  async execute(id: string, chainId: string, txHash: string): Promise<AttestiaResponse<Intent>> {
    const result = await this.http.post<Intent>(
      `/api/v1/intents/${encodeURIComponent(id)}/execute`,
      { chainId, txHash },
    );
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Verify an intent with reconciliation result.
   */
  async verify(
    id: string,
    matched: boolean,
    discrepancies?: string[],
  ): Promise<AttestiaResponse<Intent>> {
    const body: { matched: boolean; discrepancies?: string[] } = { matched };
    if (discrepancies !== undefined) {
      body.discrepancies = discrepancies;
    }
    const result = await this.http.post<Intent>(
      `/api/v1/intents/${encodeURIComponent(id)}/verify`,
      body,
    );
    return { data: result.data, status: result.status, headers: result.headers };
  }
}

/**
 * Verification operations namespace.
 */
export class VerifyNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the current global state hash.
   */
  async stateHash(): Promise<AttestiaResponse<GlobalStateHash>> {
    const result = await this.http.get<GlobalStateHash>("/api/v1/verify/hash");
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Perform a full replay verification.
   */
  async replay(input: ReplayInput): Promise<AttestiaResponse<ReplayResult>> {
    const result = await this.http.post<ReplayResult>("/api/v1/verify/replay", input);
    return { data: result.data, status: result.status, headers: result.headers };
  }
}

/**
 * Proof operations namespace.
 */
export class ProofsNamespace {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the current Merkle root.
   */
  async merkleRoot(): Promise<AttestiaResponse<MerkleRootInfo>> {
    const result = await this.http.get<MerkleRootInfo>("/api/v1/proofs/merkle-root");
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Get an attestation proof package by ID.
   */
  async getAttestation(id: string): Promise<AttestiaResponse<AttestationProofPackage>> {
    const result = await this.http.get<AttestationProofPackage>(
      `/api/v1/proofs/attestation/${encodeURIComponent(id)}`,
    );
    return { data: result.data, status: result.status, headers: result.headers };
  }

  /**
   * Verify an attestation proof package.
   */
  async verifyProof(pkg: AttestationProofPackage): Promise<AttestiaResponse<ProofVerificationResult>> {
    const result = await this.http.post<ProofVerificationResult>("/api/v1/proofs/verify", pkg);
    return { data: result.data, status: result.status, headers: result.headers };
  }
}

// =============================================================================
// Main Client
// =============================================================================

/**
 * Attestia SDK client — main entry point.
 *
 * Usage:
 * ```typescript
 * const client = new AttestiaClient({
 *   baseUrl: "https://api.attestia.io",
 *   apiKey: "your-api-key",
 * });
 *
 * const intent = await client.intents.declare({
 *   id: "pay-001",
 *   kind: "transfer",
 *   description: "Payroll batch",
 *   params: { toAddress: "0x...", amount: { amount: "1000", currency: "USDC", decimals: 6 } },
 * });
 * ```
 */
export class AttestiaClient {
  /** Intent lifecycle operations. */
  readonly intents: IntentsNamespace;
  /** Verification operations. */
  readonly verify: VerifyNamespace;
  /** Proof operations. */
  readonly proofs: ProofsNamespace;

  private readonly http: HttpClient;

  constructor(config: AttestiaClientConfig) {
    this.http = new HttpClient(config);
    this.intents = new IntentsNamespace(this.http);
    this.verify = new VerifyNamespace(this.http);
    this.proofs = new ProofsNamespace(this.http);
  }
}
