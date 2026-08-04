// Generates syndication feeds from post frontmatter. Runs as part of
// `bun run build`, after react-router build.
//
// Site-wide:  /feed.xml (RSS 2.0), /atom.xml (Atom 1.0), /feed.json (JSON Feed 1.1)
// Per tag:    /tags/<slug>/feed.xml, /atom.xml, /feed.json — same three formats
//             scoped to posts carrying that tag.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { postUrl, SITE_URL } from "../app/lib/site";
import { tagSlug } from "../app/lib/tags";
import { type FsPost, readPostsFromFs } from "./posts-fs";

const OUT_DIR = join(import.meta.dirname, "..", "build", "client");

const AUTHOR = {
  name: "Cameron Tacklind",
  url: "https://cameron.tacklind.com",
};
const SITE_TITLE = "ArbitraryShit.com";
const SITE_DESCRIPTION = "Random little projects, arbitrarily documented.";

// Feeds only need recent history; readers that missed more than this are
// better served by the site itself.
const FEED_LIMIT = 20;

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Posts carry a date but no time; noon UTC avoids timezone date-shifting. */
function stamp(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

interface FeedSpec {
  title: string;
  description: string;
  /** Page this feed represents, e.g. "/" or "/tags/hardware". */
  pagePath: string;
  /** Directory the feed files live in, relative to the site root. */
  dirPath: string;
  posts: FsPost[];
}

function writeFeeds({
  title,
  description,
  pagePath,
  dirPath,
  posts,
}: FeedSpec): void {
  const entries = posts.slice(0, FEED_LIMIT);
  const pageUrl = `${SITE_URL}${pagePath}`;
  const feedUrl = (file: string) =>
    `${SITE_URL}/${dirPath === "" ? "" : `${dirPath}/`}${file}`;
  const updated = entries.length ? stamp(entries[0].date) : new Date();

  const outDir =
    dirPath === "" ? OUT_DIR : join(OUT_DIR, ...dirPath.split("/"));
  mkdirSync(outDir, { recursive: true });

  // --- RSS 2.0 ---
  const rssItems = entries
    .map((post) => {
      const url = postUrl(post.slug);
      const categories = post.tags
        .map((tag) => `\n      <category>${escapeXml(tag)}</category>`)
        .join("");
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${stamp(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>${categories}
    </item>`;
    })
    .join("\n");

  writeFileSync(
    join(outDir, "feed.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${pageUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl("feed.xml")}" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>
`,
  );

  // --- Atom 1.0 ---
  const atomEntries = entries
    .map((post) => {
      const url = postUrl(post.slug);
      const published = stamp(post.date).toISOString();
      const categories = post.tags
        .map((tag) => `\n    <category term="${escapeXml(tag)}"/>`)
        .join("");
      return `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${url}" rel="alternate" type="text/html"/>
    <id>${url}</id>
    <published>${published}</published>
    <updated>${published}</updated>
    <summary>${escapeXml(post.description)}</summary>${categories}
  </entry>`;
    })
    .join("\n");

  writeFileSync(
    join(outDir, "atom.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link href="${feedUrl("atom.xml")}" rel="self" type="application/atom+xml"/>
  <link href="${pageUrl}" rel="alternate" type="text/html"/>
  <id>${pageUrl}</id>
  <updated>${updated.toISOString()}</updated>
  <author>
    <name>${escapeXml(AUTHOR.name)}</name>
    <uri>${AUTHOR.url}</uri>
  </author>
${atomEntries}
</feed>
`,
  );

  // --- JSON Feed 1.1 ---
  writeFileSync(
    join(outDir, "feed.json"),
    `${JSON.stringify(
      {
        version: "https://jsonfeed.org/version/1.1",
        title,
        home_page_url: pageUrl,
        feed_url: feedUrl("feed.json"),
        description,
        language: "en-US",
        authors: [AUTHOR],
        items: entries.map((post) => ({
          id: postUrl(post.slug),
          url: postUrl(post.slug),
          title: post.title,
          summary: post.description,
          content_text: post.description,
          date_published: stamp(post.date).toISOString(),
          image: `${SITE_URL}/og/${post.slug}.png`,
          tags: post.tags,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

if (!existsSync(OUT_DIR)) {
  throw new Error(`${OUT_DIR} does not exist — run the build first.`);
}

const posts = readPostsFromFs().filter((post) => !post.draft);

writeFeeds({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  pagePath: "/",
  dirPath: "",
  posts,
});

// One feed set per tag, mirroring the /tags/<slug> pages.
const byTag = new Map<string, { name: string; posts: FsPost[] }>();
for (const post of posts) {
  for (const tag of post.tags) {
    const slug = tagSlug(tag);
    const bucket = byTag.get(slug) ?? { name: tag, posts: [] };
    bucket.posts.push(post);
    byTag.set(slug, bucket);
  }
}

for (const [slug, { name, posts: tagged }] of byTag) {
  writeFeeds({
    title: `${SITE_TITLE} — ${name}`,
    description: `Posts tagged "${name}".`,
    pagePath: `/tags/${slug}`,
    dirPath: `tags/${slug}`,
    posts: tagged,
  });
}

console.log(
  `feeds written: site (rss/atom/json) + ${byTag.size} tag feed set(s), ${posts.length} post(s)`,
);
