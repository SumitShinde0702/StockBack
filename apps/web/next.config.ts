import os from "node:os";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import type { NextConfig } from "next";

const appDir = import.meta.dirname;
const workspaceRoot = path.join(appDir, "../..");

// One .env.local at the repo root serves both the web app and the contract scripts, so a
// deployed router address never has to be copied into two places.
loadEnvConfig(workspaceRoot);

/**
 * `next dev` writes to the build directory constantly, and a sync client such as OneDrive
 * locks those files mid-write, which hangs startup and throws EPERM on `.next/trace`. Dev
 * therefore builds into the temp directory.
 *
 * `next build` keeps the in-tree `.next`, because the generated route type files import
 * `next/server` relative to the build directory and cannot resolve it from outside the
 * workspace. Override either with STOCKBACK_DIST_DIR.
 */
function resolveDistDir(isDev: boolean): string {
  const override = process.env.STOCKBACK_DIST_DIR;
  if (override) return override;
  if (!isDev || !/[\\/]OneDrive[\\/]/i.test(appDir)) return ".next";
  return path.relative(appDir, path.join(os.tmpdir(), "stockback-next", "web"));
}

export default function config(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    transpilePackages: ["@stockback/sgqr"],
    distDir: resolveDistDir(phase === PHASE_DEVELOPMENT_SERVER),
    // Pin tracing to this workspace; an unrelated lockfile in the home directory
    // otherwise makes Next infer the wrong root.
    outputFileTracingRoot: workspaceRoot,
  };
}
