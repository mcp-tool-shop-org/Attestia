/**
 * Tests for SecretProvider interface and InlineSecretProvider.
 *
 * Verifies:
 * - InlineSecretProvider returns the plain string secret
 * - resolveSecret handles both string and SecretProvider
 * - SecretProvider interface is called during resolution
 * - Custom SecretProvider implementations work correctly
 */

import { describe, it, expect, vi } from "vitest";
import {
  InlineSecretProvider,
  resolveSecret,
  type SecretProvider,
} from "../src/types.js";

// =============================================================================
// InlineSecretProvider
// =============================================================================

describe("InlineSecretProvider", () => {
  it("returns the wrapped secret string", async () => {
    const provider = new InlineSecretProvider("sEdTM1uX8pu2do5XvTnutH6HsouMaM2");
    const secret = await provider.getSecret("rTestAddress");
    expect(secret).toBe("sEdTM1uX8pu2do5XvTnutH6HsouMaM2");
  });

  it("returns the same secret regardless of address", async () => {
    const provider = new InlineSecretProvider("sMySecret");
    expect(await provider.getSecret("rAddr1")).toBe("sMySecret");
    expect(await provider.getSecret("rAddr2")).toBe("sMySecret");
  });
});

// =============================================================================
// resolveSecret
// =============================================================================

describe("resolveSecret", () => {
  it("returns plain string directly", async () => {
    const result = await resolveSecret("sPlainSecret", "rAddr");
    expect(result).toBe("sPlainSecret");
  });

  it("calls SecretProvider.getSecret with the address", async () => {
    const provider: SecretProvider = {
      getSecret: vi.fn().mockResolvedValue("sFromVault"),
    };

    const result = await resolveSecret(provider, "rMyAccount");
    expect(result).toBe("sFromVault");
    expect(provider.getSecret).toHaveBeenCalledWith("rMyAccount");
    expect(provider.getSecret).toHaveBeenCalledTimes(1);
  });

  it("works with InlineSecretProvider", async () => {
    const provider = new InlineSecretProvider("sInlineSecret");
    const result = await resolveSecret(provider, "rAddr");
    expect(result).toBe("sInlineSecret");
  });

  it("propagates SecretProvider errors", async () => {
    const provider: SecretProvider = {
      getSecret: vi.fn().mockRejectedValue(new Error("Vault unavailable")),
    };

    await expect(resolveSecret(provider, "rAddr")).rejects.toThrow("Vault unavailable");
  });
});

// =============================================================================
// Custom SecretProvider
// =============================================================================

describe("custom SecretProvider", () => {
  it("can route secrets by address", async () => {
    const secrets: Record<string, string> = {
      "rAddr1": "sSecret1",
      "rAddr2": "sSecret2",
    };

    const provider: SecretProvider = {
      getSecret: async (address: string) => {
        const secret = secrets[address];
        if (!secret) throw new Error(`No secret for ${address}`);
        return secret;
      },
    };

    expect(await resolveSecret(provider, "rAddr1")).toBe("sSecret1");
    expect(await resolveSecret(provider, "rAddr2")).toBe("sSecret2");
    await expect(resolveSecret(provider, "rAddr3")).rejects.toThrow("No secret for rAddr3");
  });
});
