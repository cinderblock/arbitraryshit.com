import type { Config } from "@react-router/dev/config";
import { readPostsFromFs } from "./scripts/posts-fs";

export default {
  ssr: false,
  async prerender() {
    // Drafts are excluded: they exist only in dev, never in the built site.
    const posts = readPostsFromFs().filter((post) => !post.draft);
    return ["/", ...posts.map((post) => `/posts/${post.slug}`)];
  },
} satisfies Config;
