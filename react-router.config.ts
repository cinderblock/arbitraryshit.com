import type { Config } from "@react-router/dev/config";
import { readPostsFromFs } from "./scripts/posts-fs";

export default {
  ssr: false,
  async prerender() {
    // With ssr:false, loaders only serve paths in this list — and dev
    // enforces it too, so drafts must be listed in dev (where they're
    // viewable) but excluded from real builds.
    const dev = process.env.NODE_ENV === "development";
    const posts = readPostsFromFs().filter((post) => dev || !post.draft);
    return ["/", ...posts.map((post) => `/posts/${post.slug}`)];
  },
} satisfies Config;
