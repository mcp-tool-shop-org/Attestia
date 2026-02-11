/**
 * TenantRegistry — Maps tenant IDs to isolated AttestiaService instances.
 *
 * Each tenant gets its own domain layer (vault, ledger, treasury, etc.)
 * for complete data isolation.
 */

import { AttestiaService } from "./attestia-service.js";
import type { AttestiaServiceConfig } from "./attestia-service.js";

export class TenantRegistry {
  private readonly _tenants = new Map<string, AttestiaService>();
  private readonly _defaultConfig: AttestiaServiceConfig;

  constructor(defaultConfig: AttestiaServiceConfig) {
    this._defaultConfig = defaultConfig;
  }

  /**
   * Get or lazily create the service instance for a tenant.
   */
  getOrCreate(tenantId: string): AttestiaService {
    let service = this._tenants.get(tenantId);
    if (service === undefined) {
      service = new AttestiaService({
        ...this._defaultConfig,
        ownerId: tenantId,
      });
      this._tenants.set(tenantId, service);
    }
    return service;
  }

  /**
   * Check if a tenant has been initialized.
   */
  has(tenantId: string): boolean {
    return this._tenants.has(tenantId);
  }

  /**
   * Get all initialized tenant IDs.
   */
  tenantIds(): readonly string[] {
    return [...this._tenants.keys()];
  }

  /**
   * Gracefully stop all tenant services.
   */
  async stopAll(): Promise<void> {
    const stops = [...this._tenants.values()].map((s) => s.stop());
    await Promise.all(stops);
    this._tenants.clear();
  }
}
