// Filesystem-based post enumeration. Single source of truth for post
// metadata: route loaders (run at build time / in dev), the prerender list
// in react-router.config.ts, the RSS feed generator, and the GitHub stats
// refresher all use this. Paths are cwd-relative because loaders execute
// from the bundled server build during prerender; all entry points run from
// the repo root.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import GithubSlugger from "github-slugger";
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
  buildsOn: string[];
  /** Free-form topic tags (display strings; slugified for URLs). */
  tags: string[];
  /** Approximate prose word count of the post body. */
  words: number;
  /** Estimated reading time in whole minutes (>= 1). */
  readingMinutes: number;
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

function parseStringList(raw: unknown, key: string, mdxPath: string): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== "string")) {
    throw new Error(`"${key}" must be a list of strings in ${mdxPath}`);
  }
  return raw as string[];
}

const WORDS_PER_MINUTE = 220;

/**
 * Rough prose word count of an MDX body, for a reading-time estimate. Strips
 * the things that aren't prose the reader parses word-by-word: fenced/inline
 * code, import/export lines, JSX tags, and markdown link/image URL noise. An
 * estimate, not a measurement — good enough to set expectations.
 */
export function readingStats(body: string): {
  words: number;
  readingMinutes: number;
} {
  const text = body
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/^\s*(?:import|export)\s.*$/gm, " ") // MDX import/export
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/<[^>]+>/g, " ") // JSX/HTML tags
    .replace(/[#>*_~|]/g, " "); // markdown punctuation
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu)?.length ?? 0;
  return {
    words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}

export interface Heading {
  /** Markdown heading level (1–6). */
  depth: number;
  /** Plain-text heading, inline markdown stripped. */
  text: string;
  /** Anchor id — matches rehype-slug (github-slugger) so #links work. */
  id: string;
}

/**
 * ATX headings of an MDX body, with anchor ids matching what rehype-slug
 * assigns at compile time. Ids are slugged over ALL headings in document
 * order (a fresh github-slugger per post) so duplicate-heading suffixes line
 * up with the rendered HTML. Fenced code is stripped first so `#` comments in
 * code aren't mistaken for headings.
 */
export function extractHeadings(body: string): Heading[] {
  const withoutCode = body.replace(/```[\s\S]*?```/g, "");
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  const re = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutCode)) !== null) {
    const text = match[2]
      .replace(/`([^`]*)`/g, "$1") // inline code
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
      .replace(/[*_]/g, "") // emphasis markers
      .trim();
    headings.push({ depth: match[1].length, text, id: slugger.slug(text) });
  }
  return headings;
}

/** Headings for a single post (see extractHeadings). */
export function getPostHeadings(slug: string): Heading[] {
  const mdxPath = join(POSTS_DIR, slug, "index.mdx");
  if (!existsSync(mdxPath)) return [];
  const source = readFileSync(mdxPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return extractHeadings(match ? source.slice(match[0].length) : source);
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
      const body = source.slice(match[0].length);
      return [
        {
          slug: entry.name,
          title: frontmatter.title as string,
          date: frontmatter.date as string,
          description: frontmatter.description as string,
          draft: frontmatter.draft === true,
          github: parseGithub(frontmatter.github, mdxPath),
          related: parseStringList(frontmatter.related, "related", mdxPath),
          buildsOn: parseStringList(
            frontmatter["builds-on"],
            "builds-on",
            mdxPath,
          ),
          tags: parseStringList(frontmatter.tags, "tags", mdxPath),
          ...readingStats(body),
        },
      ];
    })
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );
}
