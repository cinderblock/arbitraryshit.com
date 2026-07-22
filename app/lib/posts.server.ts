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

export interface PostLink {
  slug: string;
  title: string;
  date: string;
  description: string;
}

export interface AdjacentPosts {
  /** The next-newer listed post, if any (chronological neighbor). */
  newer?: PostLink;
  /** The next-older listed post, if any. */
  older?: PostLink;
}

/**
 * Chronological neighbors of a post within the listing (newest first, so the
 * previous index is newer). Drafts are excluded, matching the home list; a
 * draft viewed in production has no neighbors, which is fine.
 */
export function getAdjacentPosts(slug: string): AdjacentPosts {
  const visible = listPosts();
  const i = visible.findIndex((p) => p.slug === slug);
  if (i === -1) return {};
  const toLink = (p?: PostMeta): PostLink | undefined =>
    p && {
      slug: p.slug,
      title: p.title,
      date: p.date,
      description: p.description,
    };
  return { newer: toLink(visible[i - 1]), older: toLink(visible[i + 1]) };
}

export interface PostLinks {
  /** Posts this one declares it builds on (directional, from frontmatter). */
  buildsOn: PostLink[];
  /** Reverse of buildsOn: posts that declare they build on this one. */
  builtOnBy: PostLink[];
  /** Non-directional: explicit `related:` plus backlinks, minus anything
   *  already in buildsOn/builtOnBy. */
  related: PostLink[];
}

/**
 * Cross-links for a post. A slug that doesn't exist at all is a build error
 * (catches typos at prerender time). A slug that exists but is
 * draft-filtered is silently skipped — the link appears once that post is
 * published.
 */
export function getPostLinks(post: PostMeta): PostLinks {
  const visible = listPosts();
  const bySlug = new Map(visible.map((p) => [p.slug, p]));
  const allSlugs = new Set(readPostsFromFs().map((p) => p.slug));

  for (const slug of [...post.related, ...post.buildsOn]) {
    if (!allSlugs.has(slug)) {
      throw new Error(`Post "${post.slug}" links unknown post "${slug}"`);
    }
  }

  const toLinks = (slugs: string[]): PostLink[] =>
    [...new Set(slugs)]
      .filter((slug) => slug !== post.slug)
      .flatMap((slug) => {
        const linked = bySlug.get(slug);
        if (!linked) return [];
        const { title, date, description } = linked;
        return [{ slug, title, date, description }];
      });

  const buildsOn = toLinks(post.buildsOn);
  const builtOnBy = toLinks(
    visible.filter((p) => p.buildsOn.includes(post.slug)).map((p) => p.slug),
  );

  const directional = new Set(
    [...buildsOn, ...builtOnBy].map((link) => link.slug),
  );
  const relatedBacklinks = visible
    .filter((p) => p.slug !== post.slug && p.related.includes(post.slug))
    .map((p) => p.slug);
  const related = toLinks([...post.related, ...relatedBacklinks]).filter(
    (link) => !directional.has(link.slug),
  );

  return { buildsOn, builtOnBy, related };
}
