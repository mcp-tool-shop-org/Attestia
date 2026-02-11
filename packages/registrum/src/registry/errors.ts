/**
 * Registrum Registry Errors
 *
 * Error classes for registry loading and validation.
 */

/**
 * Error thrown when the registry schema is invalid.
 */
export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}

/**
 * Error thrown when an invariant definition is invalid.
 */
export class InvariantDefinitionError extends Error {
  readonly invariantId: string | undefined;

  constructor(message: string, invariantId?: string) {
    super(invariantId ? `[${invariantId}] ${message}` : message);
    this.name = "InvariantDefinitionError";
    this.invariantId = invariantId;
  }
}
