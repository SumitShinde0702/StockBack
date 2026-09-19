import os from "node:os";
import path from "node:path";
import type { NextConfig } from "next";

const appDir = import.meta.dirname;
const workspaceRoot = path.join(appDir, "../..");

/**
 * Build output is written outside the project when the project lives inside a synced
 * folder such as OneDrive. The sync client locks files mid-write, which makes `next dev`
 * hang on startup and intermittently fails the build with EPERM on `.next/trace`.
 * Override with STOCKBACK_DIST_DIR, or set it to `.next` to restore the default.
 */
function resolveDistDir(): string {
  const override = process.env.STOCKBACK_DIST_DIR;
  if (override) return override;
  if (!/[\\/]OneDrive[\\/]/i.test(appDir)) return ".next";
  return path.relative(appDir, path.join(os.tmpdir(), "stockback-next", "web"));
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@stockback/sgqr"],
  distDir: resolveDistDir(),
  // Pin tracing to this workspace; an unrelated lockfile in the home directory
  // otherwise makes Next infer the wrong root.
  outputFileTracingRoot: workspaceRoot,
};

export default nextConfig;
