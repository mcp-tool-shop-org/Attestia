import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/cli/**"],
      thresholds: {
        statements: 94,
        branches: 85,
        functions: 83,
        lines: 94,
      },
    },
  },
});
