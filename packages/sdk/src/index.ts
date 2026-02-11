/**
 * @attestia/sdk — Typed HTTP client SDK for Attestia.
 *
 * Provides a typed, ergonomic client for interacting with the
 * Attestia API. Zero heavy dependencies — uses native fetch.
 *
 * @packageDocumentation
 */

// Types
export type {
  AttestiaClientConfig,
  AttestiaResponse,
  PaginatedList,
} from "./types.js";

export { AttestiaError } from "./types.js";

// HTTP Client
export { HttpClient } from "./http-client.js";
