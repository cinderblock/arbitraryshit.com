// Generates build/client/feed.xml (RSS 2.0) and feed.json (JSON Feed 1.1)
// from post frontmatter. Runs as part of `bun run build`, after react-router
// build.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { postUrl, SITE_URL } from "../app/lib/site";
import { readPostsFromFs } from "./posts-fs";
const OUT_DIR = join(import.meta.dirname, "..", "build", "client");

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

if (!existsSync(OUT_DIR)) {
  throw new Error(`${OUT_DIR} does not exist — run the build first.`);
}

// Feeds only need recent history; readers that missed more than this are
// better served by the site itself.
const FEED_LIMIT = 20;

const posts = readPostsFromFs().filter((post) => !post.draft);

const items = posts
  .slice(0, FEED_LIMIT)
  .map((post) => {
    const url = postUrl(post.slug);
    const pubDate = new Date(`${post.date}T12:00:00Z`).toUTCString();
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`;
  })
  .join("\n");

const lastBuildDate = posts.length
  ? new Date(`${posts[0].date}T12:00:00Z`).toUTCString()
  : new Date().toUTCString();

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ArbitraryShit.com</title>
    <link>${SITE_URL}</link>
    <description>Random little projects, arbitrarily documented.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

writeFileSync(join(OUT_DIR, "feed.xml"), feed);

// JSON Feed 1.1 — same items, for readers that prefer JSON.
const jsonFeed = {
  version: "https://jsonfeed.org/version/1.1",
  title: "ArbitraryShit.com",
  home_page_url: SITE_URL,
  feed_url: `${SITE_URL}/feed.json`,
  description: "Random little projects, arbitrarily documented.",
  language: "en-US",
  authors: [{ name: "Cameron Tacklind", url: "https://cameron.tacklind.com" }],
  items: posts.slice(0, FEED_LIMIT).map((post) => ({
    id: postUrl(post.slug),
    url: postUrl(post.slug),
    title: post.title,
    summary: post.description,
    content_text: post.description,
    date_published: `${post.date}T12:00:00Z`,
    image: `${SITE_URL}/og/${post.slug}.png`,
    tags: post.tags,
  })),
};
writeFileSync(
  join(OUT_DIR, "feed.json"),
  `${JSON.stringify(jsonFeed, null, 2)}\n`,
);

console.log(`feed.xml + feed.json written with ${posts.length} post(s)`);
