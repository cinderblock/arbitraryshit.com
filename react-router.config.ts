import type { Config } from "@react-router/dev/config";
import { readPostsFromFs } from "./scripts/posts-fs";

export default {
  ssr: false,
  async prerender() {
    // All posts, drafts included: with ssr:false, loaders only serve paths
    // in this list (and the build fails outright if the post route has a
    // loader but no paths). Drafts are prerendered as unlisted, noindexed
    // preview pages — hidden from the home page and feed, not from the URL.
    const posts = readPostsFromFs();
    return ["/", ...posts.map((post) => `/posts/${post.slug}`)];
  },
} satisfies Config;
