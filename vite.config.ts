import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import rehypeShiki from "@shikijs/rehype";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkFrontmatter, remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeShiki,
          {
            themes: {
              light: "github-light",
              dark: "github-dark",
            },
          },
        ],
      ],
    }),
    reactRouter(),
  ],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["noook", "noook.tsl"],
  },
});
