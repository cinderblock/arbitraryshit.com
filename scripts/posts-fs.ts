// Filesystem-based post enumeration. Single source of truth for post
// metadata: route loaders (run at build time / in dev), the prerender list
// in react-router.config.ts, the RSS feed generator, and the GitHub stats
// refresher all use this. Paths are cwd-relative because loaders execute
// from the bundled server build during prerender; all entry points run from
// the repo root.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface PostGithub {
  repo: string;
  commit?: string;
}

export interface FsPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  draft: boolean;
  github?: PostGithub;
  related: string[];
}

const POSTS_DIR = join(process.cwd(), "app", "posts");

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;

function parseGithub(raw: unknown, mdxPath: string): PostGithub | undefined {
  if (raw === undefined) return undefined;
  let github: PostGithub;
  if (typeof raw === "string") {
    github = { repo: raw };
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const { repo, commit } = raw as Record<string, unknown>;
    if (typeof repo !== "string") {
      throw new Error(`"github.repo" must be a string in ${mdxPath}`);
    }
    if (commit !== undefined && typeof commit !== "string") {
      throw new Error(`"github.commit" must be a string in ${mdxPath}`);
    }
    github = { repo, commit };
  } else {
    throw new Error(
      `"github" must be "owner/repo" or { repo, commit } in ${mdxPath}`,
    );
  }
  if (!REPO_RE.test(github.repo)) {
    throw new Error(
      `"github.repo" must look like "owner/repo", got "${github.repo}" in ${mdxPath}`,
    );
  }
  if (github.commit !== undefined && !COMMIT_RE.test(github.commit)) {
    throw new Error(
      `"github.commit" must be a full 40-char sha (git rev-parse HEAD) in ${mdxPath}`,
    );
  }
  return github;
}

function parseRelated(raw: unknown, mdxPath: string): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== "string")) {
    throw new Error(`"related" must be a list of post slugs in ${mdxPath}`);
  }
  return raw as string[];
}

export function readPostsFromFs(): FsPost[] {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const mdxPath = join(POSTS_DIR, entry.name, "index.mdx");
      if (!existsSync(mdxPath)) return [];
      const source = readFileSync(mdxPath, "utf8");
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) {
        throw new Error(`Missing frontmatter in ${mdxPath}`);
      }
      const frontmatter = parse(match[1]) as Record<string, unknown>;
      // Unquoted YAML dates parse as Date objects; normalize back to YYYY-MM-DD.
      if (frontmatter.date instanceof Date) {
        frontmatter.date = frontmatter.date.toISOString().slice(0, 10);
      }
      for (const field of ["title", "date", "description"]) {
        if (typeof frontmatter[field] !== "string") {
          throw new Error(`Missing "${field}" in frontmatter of ${mdxPath}`);
        }
      }
      return [
        {
          slug: entry.name,
          title: frontmatter.title as string,
          date: frontmatter.date as string,
          description: frontmatter.description as string,
          draft: frontmatter.draft === true,
          github: parseGithub(frontmatter.github, mdxPath),
          related: parseRelated(frontmatter.related, mdxPath),
        },
      ];
    })
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );
}
