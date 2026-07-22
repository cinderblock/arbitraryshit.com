import type { Config } from "@react-router/dev/config";
import { tagSlug } from "./app/lib/tags";
import { readPostsFromFs } from "./scripts/posts-fs";

export default {
  ssr: false,
  async prerender() {
    // All posts, drafts included: with ssr:false, loaders only serve paths
    // in this list (and the build fails outright if the post route has a
    // loader but no paths). Drafts are prerendered as unlisted, noindexed
    // preview pages — hidden from the home page and feed, not from the URL.
    const posts = readPostsFromFs();
    // Tag pages only for tags on listed (non-draft) posts, so every tag page
    // has at least one visible post. (Keep drafts' tags overlapping published
    // ones if their chips should resolve.)
    const tagSlugs = [
      ...new Set(
        posts
          .filter((post) => !post.draft)
          .flatMap((post) => post.tags.map(tagSlug)),
      ),
    ];
    return [
      "/",
      ...posts.map((post) => `/posts/${post.slug}`),
      ...tagSlugs.map((slug) => `/tags/${slug}`),
    ];
  },
} satisfies Config;
