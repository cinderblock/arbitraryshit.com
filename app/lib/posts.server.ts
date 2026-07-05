// Server/build-time only (never bundled for the client): route loaders call
// these at build time, so post metadata ships as prerendered data per route
// instead of JavaScript. The client bundle stays the same size no matter how
// many posts exist.
import type { FsPost } from "../../scripts/posts-fs";
import { readPostsFromFs } from "../../scripts/posts-fs";

export type PostMeta = FsPost;

/** All posts, newest first. Drafts are included only in dev. */
export function listPosts(): PostMeta[] {
  return readPostsFromFs().filter((post) => import.meta.env.DEV || !post.draft);
}

export function getPost(slug: string): PostMeta | undefined {
  return listPosts().find((post) => post.slug === slug);
}
