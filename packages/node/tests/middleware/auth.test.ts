/**
 * Tests for authentication middleware.
 *
 * Verifies:
 * - API key auth (valid, invalid, missing)
 * - JWT bearer auth (valid, invalid, expired)
 * - Permission guard (allowed, denied)
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "../../src/types/api-contract.js";
import type { ApiKeyRecord, AuthContext } from "../../src/types/auth.js";
import {
  authMiddleware,
  requirePermission,
  signJwt,
  verifyJwt,
} from "../../src/middleware/auth.js";

const JWT_SECRET = "test-secret-key-for-unit-tests";

function makeApp(apiKeys: ApiKeyRecord[] = []) {
  const keyMap = new Map<string, ApiKeyRecord>();
  for (const k of apiKeys) {
    keyMap.set(k.key, k);
  }

  const app = new Hono<AppEnv>();
  app.use(
    "*",
    authMiddleware({
      apiKeys: keyMap,
      jwtSecret: JWT_SECRET,
      jwtIssuer: "attestia",
    }),
  );
  app.get("/test", (c) => {
    const auth = c.get("auth");
    return c.json({ auth });
  });
  app.get("/admin-only", requirePermission("admin"), (c) => {
    return c.json({ ok: true });
  });
  app.get("/write-only", requirePermission("write"), (c) => {
    return c.json({ ok: true });
  });

  return app;
}

describe("API Key auth", () => {
  it("authenticates with a valid API key", async () => {
    const app = makeApp([
      { key: "key-1", role: "operator", tenantId: "tenant-1" },
    ]);

    const res = await app.request("/test", {
      headers: { "X-Api-Key": "key-1" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { auth: AuthContext };
    expect(body.auth.type).toBe("api-key");
    expect(body.auth.role).toBe("operator");
    expect(body.auth.tenantId).toBe("tenant-1");
  });

  it("returns 401 for an invalid API key", async () => {
    const app = makeApp([
      { key: "key-1", role: "operator", tenantId: "tenant-1" },
    ]);

    const res = await app.request("/test", {
      headers: { "X-Api-Key": "invalid-key" },
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when no auth is provided", async () => {
    const app = makeApp();
    const res = await app.request("/test");
    expect(res.status).toBe(401);
  });
});

describe("JWT Bearer auth", () => {
  it("authenticates with a valid JWT", async () => {
    const app = makeApp();

    const token = signJwt(
      {
        sub: "user-1",
        role: "admin",
        tenantId: "jwt-tenant",
        iss: "attestia",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET,
    );

    const res = await app.request("/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { auth: AuthContext };
    expect(body.auth.type).toBe("jwt");
    expect(body.auth.identity).toBe("user-1");
    expect(body.auth.role).toBe("admin");
    expect(body.auth.tenantId).toBe("jwt-tenant");
  });

  it("returns 401 for an expired JWT", async () => {
    const app = makeApp();

    const token = signJwt(
      {
        sub: "user-1",
        role: "admin",
        tenantId: "jwt-tenant",
        iss: "attestia",
        exp: Math.floor(Date.now() / 1000) - 100, // expired
      },
      JWT_SECRET,
    );

    const res = await app.request("/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 for a tampered JWT", async () => {
    const app = makeApp();

    const token = signJwt(
      {
        sub: "user-1",
        role: "admin",
        tenantId: "jwt-tenant",
        iss: "attestia",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET,
    );

    // Tamper with the signature
    const tampered = token.slice(0, -5) + "XXXXX";

    const res = await app.request("/test", {
      headers: { Authorization: `Bearer ${tampered}` },
    });

    expect(res.status).toBe(401);
  });
});

describe("verifyJwt", () => {
  it("returns undefined for malformed token", () => {
    expect(verifyJwt("not-a-jwt", JWT_SECRET)).toBeUndefined();
  });

  it("returns undefined for wrong issuer", () => {
    const token = signJwt(
      {
        sub: "user-1",
        role: "admin",
        tenantId: "t1",
        iss: "wrong-issuer",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET,
    );

    expect(verifyJwt(token, JWT_SECRET, "attestia")).toBeUndefined();
  });
});

describe("permission guard", () => {
  it("allows admin to access admin-only route", async () => {
    const app = makeApp([
      { key: "admin-key", role: "admin", tenantId: "t1" },
    ]);

    const res = await app.request("/admin-only", {
      headers: { "X-Api-Key": "admin-key" },
    });
    expect(res.status).toBe(200);
  });

  it("denies viewer from admin-only route", async () => {
    const app = makeApp([
      { key: "viewer-key", role: "viewer", tenantId: "t1" },
    ]);

    const res = await app.request("/admin-only", {
      headers: { "X-Api-Key": "viewer-key" },
    });
    expect(res.status).toBe(403);
  });

  it("allows operator to access write routes", async () => {
    const app = makeApp([
      { key: "op-key", role: "operator", tenantId: "t1" },
    ]);

    const res = await app.request("/write-only", {
      headers: { "X-Api-Key": "op-key" },
    });
    expect(res.status).toBe(200);
  });

  it("denies viewer from write routes", async () => {
    const app = makeApp([
      { key: "viewer-key", role: "viewer", tenantId: "t1" },
    ]);

    const res = await app.request("/write-only", {
      headers: { "X-Api-Key": "viewer-key" },
    });
    expect(res.status).toBe(403);
  });
});
