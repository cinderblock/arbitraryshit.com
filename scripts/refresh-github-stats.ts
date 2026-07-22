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

/** Latest release, or the most recent tag, or null if the repo has neither. */
async function fetchLatestVersion(
  repo: string,
): Promise<RepoStats["latestVersion"]> {
  try {
    const rel = await ghJson<{
      tag_name: string;
      html_url: string;
      published_at: string | null;
    }>(`/repos/${repo}/releases/latest`);
    return {
      tag: rel.tag_name,
      url: rel.html_url,
      publishedAt: rel.published_at,
    };
  } catch {
    // No published release — fall back to the most recent tag, if any.
  }
  try {
    const tags = await ghJson<Array<{ name: string }>>(
      `/repos/${repo}/tags?per_page=1`,
    );
    if (tags.length > 0) {
      return {
        tag: tags[0].name,
        url: `https://github.com/${repo}/releases/tag/${tags[0].name}`,
        publishedAt: null,
      };
    }
  } catch {
    // No tags either.
  }
  return null;
}

async function fetchRepoStats(
  repo: string,
  pins: string[],
): Promise<RepoStats> {
  const info = await ghJson<{
    stargazers_count: number;
    open_issues_count: number;
    default_branch: string;
    pushed_at: string;
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

  const latestVersion = await fetchLatestVersion(repo);

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
    lastPushed: info.pushed_at,
    latestVersion,
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
let failures = 0;
for (const repo of [...repos.keys()].sort()) {
  try {
    next[repo] = await fetchRepoStats(
      repo,
      [...(repos.get(repo) ?? [])].sort(),
    );
    console.log(`${repo}: ${JSON.stringify(next[repo])}`);
  } catch (error) {
    // A repo that doesn't exist yet (post drafted before the code is pushed)
    // or a transient API error shouldn't sink the whole refresh. Keep the
    // last-known stats for that repo, if any, and carry on.
    failures++;
    console.warn(`Skipping ${repo}: ${error}`);
    if (previous[repo]) next[repo] = previous[repo];
  }
}

if (failures > 0) {
  console.warn(`${failures} repo(s) skipped this run.`);
}

if (withoutFetchedAt(previous) === withoutFetchedAt(next)) {
  console.log("No changes (ignoring fetch date); leaving file untouched.");
} else {
  mkdirSync(dirname(STATS_PATH), { recursive: true });
  writeFileSync(STATS_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${STATS_PATH} with ${Object.keys(next).length} repo(s).`);
}
