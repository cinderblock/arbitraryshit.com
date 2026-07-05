// Server/build-time only (never bundled for the client): route loaders call
// these at build time, so post metadata ships as prerendered data per route
// instead of JavaScript. The client bundle stays the same size no matter how
// many posts exist.
import type { FsPost } from "../../scripts/posts-fs";
import { readPostsFromFs } from "../../scripts/posts-fs";

export type PostMeta = FsPost;

/**
 * Listed posts, newest first. Drafts are listed only in dev; in production
 * they're unlisted (but still prerendered — see getPost).
 */
export function listPosts(): PostMeta[] {
  return readPostsFromFs().filter((post) => import.meta.env.DEV || !post.draft);
}

/** Any post by slug, drafts included — draft pages exist as unlisted URLs. */
export function getPost(slug: string): PostMeta | undefined {
  return readPostsFromFs().find((post) => post.slug === slug);
}

export interface RelatedPost {
  slug: string;
  title: string;
  date: string;
  description: string;
}

/**
 * Related posts for a post: its explicit `related:` list first, then
 * backlinks (posts whose `related:` lists this one), newest first.
 *
 * A slug that doesn't exist at all is a build error (catches typos at
 * prerender time). A slug that exists but is draft-filtered is silently
 * skipped — the link appears once that post is published.
 */
export function getRelatedPosts(post: PostMeta): RelatedPost[] {
  const visible = listPosts();
  const bySlug = new Map(visible.map((p) => [p.slug, p]));
  const allSlugs = new Set(readPostsFromFs().map((p) => p.slug));

  for (const slug of post.related) {
    if (!allSlugs.has(slug)) {
      throw new Error(
        `Post "${post.slug}" lists unknown related post "${slug}"`,
      );
    }
  }

  const backlinks = visible
    .filter((p) => p.slug !== post.slug && p.related.includes(post.slug))
    .map((p) => p.slug);

  const slugs = [...new Set([...post.related, ...backlinks])].filter(
    (slug) => slug !== post.slug,
  );

  return slugs.flatMap((slug) => {
    const related = bySlug.get(slug);
    if (!related) return [];
    const { title, date, description } = related;
    return [{ slug, title, date, description }];
  });
}
