// Refreshes data/github-stats.json for every GitHub repo referenced by a
// post. Run daily by .github/workflows/refresh-github-stats.yml (which
// commits the result, triggering a Cloudflare Pages rebuild) or locally via
// `bun run refresh:github`. Only rewrites the file when something besides
// the fetch date changed, so the cron job doesn't produce empty commits.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  readStatsFile,
  type RepoStats,
  STATS_PATH,
  type StatsFile,
} from "./github-stats";
import { readPostsFromFs } from "./posts-fs";

const token = process.env.GITHUB_TOKEN;

async function gh(path: string): Promise<Response> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "arbitraryshit.com-stats",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res;
}

async function ghJson<T>(path: string): Promise<T> {
  return (await gh(path)).json() as Promise<T>;
}

/** Count via the Link header's rel="last" page number (per_page=1). */
async function countFromLink(path: string): Promise<number> {
  const res = await gh(path);
  const link = res.headers.get("link");
  const last = link?.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (last) return Number(last[1]);
  return ((await res.json()) as unknown[]).length;
}

async function fetchRepoStats(
  repo: string,
  pins: string[],
): Promise<RepoStats> {
  const info = await ghJson<{
    stargazers_count: number;
    open_issues_count: number;
    default_branch: string;
  }>(`/repos/${repo}`);

  const prSearch = await ghJson<{ total_count: number }>(
    `/search/issues?q=${encodeURIComponent(`repo:${repo} is:pr is:open`)}&per_page=1`,
  );
  const openPRs = prSearch.total_count;

  const contributors = await countFromLink(
    `/repos/${repo}/contributors?per_page=1`,
  );

  const head = await ghJson<{ sha: string }>(
    `/repos/${repo}/commits/${encodeURIComponent(info.default_branch)}`,
  );

  const aheadBy: Record<string, number | null> = {};
  for (const pin of pins) {
    try {
      const compare = await ghJson<{ ahead_by: number }>(
        `/repos/${repo}/compare/${pin}...${encodeURIComponent(info.default_branch)}`,
      );
      aheadBy[pin] = compare.ahead_by;
    } catch (error) {
      console.warn(`Could not compare ${repo}@${pin}: ${error}`);
      aheadBy[pin] = null;
    }
  }

  return {
    fetchedAt: new Date().toISOString().slice(0, 10),
    stars: info.stargazers_count,
    // open_issues_count includes PRs; report actual issues.
    openIssues: Math.max(0, info.open_issues_count - openPRs),
    openPRs,
    contributors,
    defaultBranch: info.default_branch,
    headSha: head.sha,
    aheadBy,
  };
}

function withoutFetchedAt(stats: StatsFile): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(stats).map(([repo, { fetchedAt: _, ...rest }]) => [
        repo,
        rest,
      ]),
    ),
  );
}

// Collect repo -> pinned shas from all posts (drafts included, so stats are
// ready in dev before a post is published).
const repos = new Map<string, Set<string>>();
for (const post of readPostsFromFs()) {
  if (!post.github) continue;
  const pins = repos.get(post.github.repo) ?? new Set<string>();
  if (post.github.commit) pins.add(post.github.commit);
  repos.set(post.github.repo, pins);
}

const previous = readStatsFile();
const next: StatsFile = {};
for (const repo of [...repos.keys()].sort()) {
  next[repo] = await fetchRepoStats(repo, [...(repos.get(repo) ?? [])].sort());
  console.log(`${repo}: ${JSON.stringify(next[repo])}`);
}

if (withoutFetchedAt(previous) === withoutFetchedAt(next)) {
  console.log("No changes (ignoring fetch date); leaving file untouched.");
} else {
  mkdirSync(dirname(STATS_PATH), { recursive: true });
  writeFileSync(STATS_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${STATS_PATH} with ${Object.keys(next).length} repo(s).`);
}
