// Client-safe tag helpers. Pure and dependency-free so it can be bundled into
// the client for chip links as well as run at build time (posts-fs, prerender).

/** URL slug for a tag: lowercase, non-alphanumerics collapsed to hyphens. */
export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
