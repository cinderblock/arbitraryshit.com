// Shared types and I/O for the committed GitHub stats snapshot.
// Written by scripts/refresh-github-stats.ts (daily GitHub Action),
// read by route loaders at build time via app/lib/github.server.ts.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface RepoStats {
  /** YYYY-MM-DD of the last refresh that changed anything. */
  fetchedAt: string;
  stars: number;
  /** Open issues, excluding PRs. */
  openIssues: number;
  openPRs: number;
  contributors: number;
  defaultBranch: string;
  headSha: string;
  /** ISO timestamp of the most recent push (activity recency). */
  lastPushed: string;
  /**
   * Latest release (preferred) or most recent tag, or null if the repo has
   * neither. `publishedAt` is null for a bare tag with no release.
   */
  latestVersion: {
    tag: string;
    url: string;
    publishedAt: string | null;
  } | null;
  /**
   * Commits the default branch is ahead of each pinned sha referenced by a
   * post. null = the pin could not be compared (e.g. force-pushed away).
   */
  aheadBy: Record<string, number | null>;
}

export type StatsFile = Record<string, RepoStats>;

export const STATS_PATH = join(process.cwd(), "data", "github-stats.json");

export function readStatsFile(): StatsFile {
  if (!existsSync(STATS_PATH)) return {};
  return JSON.parse(readFileSync(STATS_PATH, "utf8")) as StatsFile;
}
