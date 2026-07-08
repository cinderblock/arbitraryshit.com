import type { ComponentType } from "react";

// Client-safe post utilities. Post metadata deliberately does NOT live here —
// it comes from route loaders (see app/lib/posts.server.ts) so it ships as
// per-route prerendered data, not JavaScript.

// A compiled MDX body accepts a `components` map for the JSX tags it uses
// (see app/components/mdx-components.ts).
export type PostBody = ComponentType<{
  components?: Record<string, unknown>;
}>;

// Post bodies are only ever imported dynamically, so each post (and any
// interactive components it pulls in) is its own chunk, loaded on demand.
const bodies = import.meta.glob<{ default: PostBody }>("../posts/*/index.mdx");

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
