// Writes build/client/build-info.json — a tiny machine-readable record of
// which commit produced the deployed site. External monitors (the ops uptime
// worker) compare it against the repo's HEAD to detect a deploy pipeline that
// has silently stopped: exactly the failure that left this site serving
// 8-day-old content in 2026-08 with no error anywhere.
//
// Runs as part of `bun run build`, after react-router build.
import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(import.meta.dirname, "..", "build", "client");

if (!existsSync(OUT_DIR)) {
  throw new Error(`${OUT_DIR} does not exist — run the build first.`);
}

/** Local git, for dev builds; empty string if git isn't available. */
function git(args: string): string {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// Cloudflare Pages injects these during a git-connected build; fall back to
// local git so `bun run build` on a workstation produces the same shape.
const commit =
  process.env.CF_PAGES_COMMIT_SHA || git("rev-parse HEAD") || "unknown";
const branch =
  process.env.CF_PAGES_BRANCH ||
  git("rev-parse --abbrev-ref HEAD") ||
  "unknown";

const buildInfo = {
  commit,
  short: commit.slice(0, 8),
  branch,
  builtAt: new Date().toISOString(),
  // Present so a monitor can tell a real build-info document apart from an
  // SPA-fallback HTML page served with a 200 for a missing file.
  kind: "build-info",
};

writeFileSync(
  join(OUT_DIR, "build-info.json"),
  `${JSON.stringify(buildInfo, null, 2)}\n`,
);

console.log(`build-info.json written: ${buildInfo.short} (${branch})`);
