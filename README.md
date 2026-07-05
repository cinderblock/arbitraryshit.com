# ArbitraryShit.com

Random little projects, arbitrarily documented. A fully static blog with a
bespoke stack — no off-the-shelf SSG.

## Stack

- **React 19** + **React Router 8** — SPA mode (`ssr: false`) with every route
  prerendered to static HTML at build time
- **MDX** — posts are `.mdx` files with YAML frontmatter; shiki highlights
  code at build time (zero client JS for highlighting)
- **Vite 8** — build tool and dev server
- **Bun** — package manager and runtime
- **Playwright** — end-to-end tests
- **oxfmt** + **lefthook** — formatting and pre-commit hooks
- **Cloudflare Pages** — git-connected build + hosting (push to `master`
  deploys; GitHub Actions runs CI only)

## Writing a post

Create a folder under `app/posts/` — the folder name is the URL slug:

```
app/posts/my-cool-thing/
  index.mdx     — required; the post
  photo.jpg     — images live next to the words
  widget.tsx    — interactive React components, imported by the MDX
```

`index.mdx` starts with frontmatter:

```mdx
---
title: "My Cool Thing"
date: "2026-07-11"
description: "One-liner shown on the home page and in the RSS feed."
---

Words. Markdown. Code blocks get highlighted automatically.
```

- **Images**: `import photo from "./photo.jpg"` then `<img src={photo} alt="…" />`.
  Vite hashes and copies the asset.
- **Interactive elements**: export a component from a `.tsx` file in the post
  folder, import it in the MDX, drop it in the prose. It hydrates client-side.
- **Drafts**: add `draft: true` to the frontmatter. Drafts render in dev
  (with a badge) but are excluded from the built site and the feed.

Commit, push to `master`, and Cloudflare Pages builds and deploys it.

## How posts are wired

Built to stay O(1) per page view as the blog grows — no bundle or page
downloads more because there are more posts:

- `scripts/posts-fs.ts` — single source of truth: enumerates
  `app/posts/*/index.mdx` and parses frontmatter via `node:fs`. Used by the
  prerender list in `react-router.config.ts`, the RSS generator
  (`scripts/generate-feed.ts`, emits `build/client/feed.xml`, capped to the
  20 newest), and route loaders (via `app/lib/posts.server.ts`).
- Route loaders run at **build time** (`ssr: false` + prerender), so post
  metadata ships as per-route `.data` files and prerendered HTML — never as
  JavaScript. The home route's loader carries the full list; each post
  route's loader carries only its own frontmatter.
- `app/lib/posts.ts` — client side: post bodies are only ever imported
  dynamically (`import.meta.glob`), so each post plus its interactive
  components is its own chunk, fetched only when that post is viewed.

## Scripts

| Script              | Description                  |
| ------------------- | ---------------------------- |
| `bun run dev`       | Start dev server             |
| `bun run build`     | Build static site + RSS feed |
| `bun run preview`   | Preview built site           |
| `bun run test`      | Run Playwright tests         |
| `bun run test:ui`   | Run tests with Playwright UI |
| `bun run fmt`       | Format all files with oxfmt  |
| `bun run fmt:check` | Check formatting             |
| `bun run typecheck` | Type check                   |

## Deployment

Cloudflare Pages builds from this repo on push to `master`
(`bun run build`, output `build/client`). The Pages project, custom domain,
and DNS are managed in the ops repo (`cinderblock/ops`,
`cloudflare/config/isozilla/arbitraryshit.yaml`) — never changed by hand.

## Development tips

- Append `?light` to any URL during development to force light mode.
- Favicons adapt to light/dark mode (`public/favicon-*.svg`).
