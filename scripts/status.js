#!/usr/bin/env node

/**
 * attestia-status — Monorepo health summary.
 *
 * Reports package versions, dependency counts, and overall structure.
 * Useful for quick sanity checks before releases or audits.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function main() {
  const rootPkg = readJson(join(ROOT, "package.json"));
  console.log(`\n  Attestia Monorepo Status`);
  console.log(`  ${"─".repeat(40)}`);
  console.log(`  Root version:  ${rootPkg.version}`);
  console.log(`  Node engine:   ${rootPkg.engines?.node ?? "unspecified"}`);
  console.log(`  Package mgr:   ${rootPkg.packageManager ?? "unspecified"}`);

  const dirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  console.log(`\n  Packages (${dirs.length}):\n`);
  console.log(
    `  ${"Name".padEnd(20)} ${"Version".padEnd(10)} ${"Deps".padStart(5)} ${"DevDeps".padStart(8)}  Tests`
  );
  console.log(
    `  ${"─".repeat(20)} ${"─".repeat(10)} ${"─".repeat(5)} ${"─".repeat(8)}  ${"─".repeat(6)}`
  );

  let totalDeps = 0;
  let packagesWithTests = 0;

  for (const dir of dirs) {
    const pkgPath = join(PACKAGES_DIR, dir, "package.json");
    if (!existsSync(pkgPath)) continue;

    const pkg = readJson(pkgPath);
    const deps = Object.keys(pkg.dependencies ?? {}).length;
    const devDeps = Object.keys(pkg.devDependencies ?? {}).length;
    totalDeps += deps;

    // Check for test script
    const hasTests = pkg.scripts?.test ? "yes" : "—";
    if (pkg.scripts?.test) packagesWithTests++;

    const name = pkg.name?.replace("@attestia/", "") ?? dir;
    console.log(
      `  ${name.padEnd(20)} ${(pkg.version ?? "—").padEnd(10)} ${String(deps).padStart(5)} ${String(devDeps).padStart(8)}  ${hasTests}`
    );
  }

  console.log(`\n  ${"─".repeat(40)}`);
  console.log(`  Total packages:    ${dirs.length}`);
  console.log(`  With tests:        ${packagesWithTests}`);
  console.log(`  Total runtime deps: ${totalDeps}`);

  // Check for security files
  const securityFiles = [
    "SECURITY.md",
    "THREAT_MODEL.md",
    "CONTROL_MATRIX.md",
    "LICENSE",
  ];
  const present = securityFiles.filter((f) => existsSync(join(ROOT, f)));
  console.log(`  Security files:    ${present.length}/${securityFiles.length} present`);
  console.log("");
}

main();
