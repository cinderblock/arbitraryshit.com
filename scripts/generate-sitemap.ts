// Generates build/client/sitemap.xml. Runs as part of `bun run build`, after
// react-router build. Lists the home page, archive, published posts, and tag
// pages — drafts are unlisted+noindex and deliberately absent.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "../app/lib/site";
import { tagSlug } from "../app/lib/tags";
import { readPostsFromFs } from "./posts-fs";

const OUT_DIR = join(import.meta.dirname, "..", "build", "client");

if (!existsSync(OUT_DIR)) {
  throw new Error(`${OUT_DIR} does not exist — run the build first.`);
}

const posts = readPostsFromFs().filter((post) => !post.draft);
const newest = posts[0]?.date;

// Tag pages inherit the date of their newest member post.
const tagDates = new Map<string, string>();
for (const post of posts) {
  for (const tag of post.tags) {
    const slug = tagSlug(tag);
    const current = tagDates.get(slug);
    if (!current || post.date > current) tagDates.set(slug, post.date);
  }
}

interface Entry {
  loc: string;
  lastmod?: string;
}

const entries: Entry[] = [
  { loc: `${SITE_URL}/`, lastmod: newest },
  { loc: `${SITE_URL}/archive`, lastmod: newest },
  ...posts.map((post) => ({
    loc: `${SITE_URL}/posts/${post.slug}`,
    lastmod: post.date,
  })),
  ...[...tagDates.entries()].map(([slug, date]) => ({
    loc: `${SITE_URL}/tags/${slug}`,
    lastmod: date,
  })),
];

const urls = entries
  .map(
    ({ loc, lastmod }) =>
      `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`,
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(join(OUT_DIR, "sitemap.xml"), sitemap);
console.log(`sitemap.xml written with ${entries.length} URL(s)`);
