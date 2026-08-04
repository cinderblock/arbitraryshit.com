// Validates the generated feeds in build/client. Runs as the last step of
// `bun run build`, so a malformed feed fails the build instead of shipping.
// Checks: every feed file parses, every absolute site URL is well-formed
// (a missing slash after the domain is the classic bug), every feed URL
// points at a file that exists, and each tag page advertises its own feeds.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "../app/lib/site";

const OUT_DIR = join(import.meta.dirname, "..", "build", "client");
const problems: string[] = [];

function feedFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) feedFiles(path, found);
    else if (/^(feed|atom)\.(xml|json)$/.test(entry.name)) found.push(path);
  }
  return found;
}

/** Minimal well-formedness check: element open/close tags must nest. */
function checkXml(file: string, xml: string): void {
  const stack: string[] = [];
  for (const [, close, name, attrs, self] of xml.matchAll(
    /<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>/g,
  )) {
    if (name === "xml" || attrs.trim().startsWith("?") || self === "/")
      continue;
    if (close) {
      const open = stack.pop();
      if (open !== name) {
        problems.push(`${file}: tag mismatch — </${name}> closes <${open}>`);
        return;
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length > 0) {
    problems.push(`${file}: unclosed tag(s) ${stack.join(", ")}`);
  }
}

if (!existsSync(OUT_DIR)) {
  throw new Error(`${OUT_DIR} does not exist — run the build first.`);
}

const files = feedFiles(OUT_DIR);
if (files.length === 0) problems.push("no feed files were generated");

for (const file of files) {
  const rel = file.slice(OUT_DIR.length + 1).replaceAll("\\", "/");
  const body = readFileSync(file, "utf8");

  if (file.endsWith(".json")) {
    try {
      JSON.parse(body);
    } catch (error) {
      problems.push(`${rel}: invalid JSON — ${error}`);
    }
  } else {
    checkXml(rel, body);
  }

  // A site URL must always be followed by "/" — catches `${SITE_URL}${path}`
  // concatenation bugs that produce e.g. "https://example.comtags/x/feed.xml".
  for (const [, next] of body.matchAll(
    new RegExp(
      `${SITE_URL.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}([^/"\\s<])`,
      "g",
    ),
  )) {
    problems.push(`${rel}: malformed URL — site root followed by "${next}"`);
  }

  // Every feed URL a feed advertises should resolve to a generated file.
  for (const [, path] of body.matchAll(
    /https:\/\/arbitraryshit\.com(\/[^"\s<]*(?:feed\.xml|atom\.xml|feed\.json))/g,
  )) {
    if (!existsSync(join(OUT_DIR, ...path.split("/")))) {
      problems.push(`${rel}: advertises ${path}, which was not generated`);
    }
  }
}

// Each tag page should link its own three feeds.
const tagsDir = join(OUT_DIR, "tags");
if (existsSync(tagsDir)) {
  for (const entry of readdirSync(tagsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const page = join(tagsDir, entry.name, "index.html");
    if (!existsSync(page)) continue;
    const html = readFileSync(page, "utf8");
    for (const file of ["feed.xml", "atom.xml", "feed.json"]) {
      if (!html.includes(`/tags/${entry.name}/${file}`)) {
        problems.push(`tags/${entry.name}/index.html: no link to ${file}`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Feed validation failed (${problems.length} problem(s)):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`feeds verified: ${files.length} file(s), no problems`);
