// Build-time only: assembles the repo card data for a post from the
// committed stats snapshot (data/github-stats.json, refreshed daily by a
// GitHub Action). Each post's loader ships only its own repo's numbers.
import type { RepoCardData } from "../components/repo-card";
import { readStatsFile } from "../../scripts/github-stats";
import type { PostMeta } from "./posts.server";

export function getRepoCard(post: PostMeta): RepoCardData | undefined {
  if (!post.github) return undefined;
  const { repo, commit } = post.github;
  const stats = readStatsFile()[repo];
  return {
    repo,
    commit,
    stats: stats && {
      stars: stats.stars,
      openIssues: stats.openIssues,
      openPRs: stats.openPRs,
      contributors: stats.contributors,
      defaultBranch: stats.defaultBranch,
      lastPushed: stats.lastPushed,
      latestVersion: stats.latestVersion ?? null,
      aheadBy: commit !== undefined ? stats.aheadBy[commit] : undefined,
    },
  };
}
