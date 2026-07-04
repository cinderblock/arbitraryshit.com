// Filesystem-based post enumeration for build-time consumers
// (react-router.config.ts prerender and the RSS feed generator).
// Runtime code uses app/lib/posts.ts (import.meta.glob) instead.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface FsPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  draft: boolean;
}

const POSTS_DIR = join(import.meta.dirname, "..", "app", "posts");

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
        },
      ];
    })
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
    );
}
