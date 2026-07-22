// Generates 1200x630 Open Graph card PNGs, one per post plus a site default,
// into build/client/og/. Runs as part of `bun run build`, after the
// react-router build (needs build/client to exist). Pure build-time: satori
// renders JSX -> SVG, @resvg/resvg-js rasterizes SVG -> PNG. No browser.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { readPostsFromFs } from "./posts-fs";

// Inlined rather than imported from app/lib/posts: that module runs
// `import.meta.glob` at load, which only exists under Vite (crashes plain Bun).
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "build", "client", "og");

if (!existsSync(join(ROOT, "build", "client"))) {
  throw new Error("build/client does not exist — run the build first.");
}
mkdirSync(OUT_DIR, { recursive: true });

const fontFile = (weight: number) =>
  readFileSync(
    join(
      ROOT,
      "node_modules",
      "@fontsource",
      "inter",
      "files",
      `inter-latin-${weight}-normal.woff`,
    ),
  );

const fonts = [
  {
    name: "Inter",
    data: fontFile(400),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Inter",
    data: fontFile(600),
    weight: 600 as const,
    style: "normal" as const,
  },
  {
    name: "Inter",
    data: fontFile(700),
    weight: 700 as const,
    style: "normal" as const,
  },
];

// Site palette, echoing the default dark theme.
const BG = "linear-gradient(135deg, #0f0f1a 0%, #171327 55%, #0f0f1a 100%)";
const TEXT = "#f2f2f5";
const MUTED = "#a3a3b4";
const ACCENT = "linear-gradient(90deg, #10b981, #3b82f6, #a855f7)";

function Card({
  title,
  subtitle,
  titleSize,
}: {
  title: string;
  subtitle: string;
  titleSize: number;
}) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 88px",
        background: BG,
        color: TEXT,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 34,
          fontWeight: 600,
        }}
      >
        <span>ArbitraryShit</span>
        <span style={{ color: MUTED }}>.com</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            width: 104,
            height: 10,
            borderRadius: 999,
            background: ACCENT,
            marginBottom: 34,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        <div
          style={{ display: "flex", fontSize: 30, color: MUTED, marginTop: 28 }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

async function renderCard(element: React.ReactElement, outFile: string) {
  const svg = await satori(element, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
    .render()
    .asPng();
  writeFileSync(join(OUT_DIR, outFile), png);
}

const posts = readPostsFromFs();

// Default card for the home page and any page without its own image.
await renderCard(
  <Card
    title="Arbitrary Shit"
    subtitle="Random little projects, arbitrarily documented."
    titleSize={92}
  />,
  "default.png",
);

for (const post of posts) {
  const subtitle = `${formatDate(post.date)}  ·  ${post.readingMinutes} min read`;
  const titleSize = post.title.length > 42 ? 54 : 66;
  await renderCard(
    <Card title={post.title} subtitle={subtitle} titleSize={titleSize} />,
    `${post.slug}.png`,
  );
}

console.log(`og: wrote ${posts.length + 1} card(s) to build/client/og/`);
