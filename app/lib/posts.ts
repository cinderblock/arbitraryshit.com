import type { ComponentType } from "react";
import { posts as allPosts } from "virtual:posts-meta";

export type { PostMeta } from "virtual:posts-meta";

// Post bodies are only ever imported dynamically, so each post (and any
// interactive components it pulls in) is its own chunk. Metadata comes from
// virtual:posts-meta instead of the MDX modules to keep it that way.
const bodies = import.meta.glob<{ default: ComponentType }>(
  "../posts/*/index.mdx",
);

/** All posts, newest first. Drafts are included only in dev. */
export const posts = allPosts.filter(
  (post) => import.meta.env.DEV || !post.draft,
);

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getPostBody(slug: string) {
  return bodies[`../posts/${slug}/index.mdx`];
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
