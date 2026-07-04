// Vite plugin exposing post frontmatter as `virtual:posts-meta`.
// Keeps metadata out of the MDX modules at runtime so post bodies remain
// purely dynamic imports (one chunk per post). Metadata comes from the same
// filesystem enumeration the prerenderer and feed generator use.
import type { Plugin } from "vite";
import { readPostsFromFs } from "./posts-fs";

const VIRTUAL_ID = "virtual:posts-meta";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export function postsMeta(): Plugin {
  return {
    name: "posts-meta",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      return `export const posts = ${JSON.stringify(readPostsFromFs())};`;
    },
    handleHotUpdate({ file, server, modules }) {
      if (!file.endsWith("index.mdx")) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (!mod) return;
      server.moduleGraph.invalidateModule(mod);
      return [...modules, mod];
    },
  };
}
