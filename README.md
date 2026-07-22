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
tags:
  - hardware
  - web
---

Words. Markdown. Code blocks get highlighted automatically.
```

- **Images**: `import photo from "./photo.jpg"` then `<img src={photo} alt="…" />`.
  Vite hashes and copies the asset.
- **Interactive elements**: export a component from a `.tsx` file in the post
  folder, import it in the MDX, drop it in the prose. It hydrates client-side.
- **AI-first content**: wrap it in `<AiGenerated>` (available in every post's
  MDX, no import) so it's visibly — but quietly — marked (tint, accent edge,
  italic prose, small "AI" mark).
- **Drafts**: add `draft: true` to the frontmatter. Drafts are listed in dev
  (with a badge); in production they're unlisted — off the home page and
  feed, `noindex` for crawlers — but still built, so the URL works as a
  shareable preview.
- **Permalinks**: the post lives at `https://arbitraryshit.com/posts/<folder-name>`
  as prerendered HTML with a canonical tag; headings get anchor ids, so
  `/posts/my-cool-thing#some-section` deep-links work too.
- **Repo card**: add `github: owner/repo` to show a standardized GitHub card
  under the title — latest release/tag, stars, open issues, open PRs,
  contributors, and last-activity date. Pin the commit you wrote against to
  also get a "N commits since" drift line:

  ```yaml
  github:
    repo: owner/repo
    commit: <git -C <project> rev-parse HEAD>
  ```

- **Linking posts**: `builds-on: [other-slug]` for directional dependencies
  (tools built on other tools) — renders "Builds on …" under the title and a
  "Built on by …" backlink on the other post. `related: [other-slug]` for
  non-directional links, also symmetric. Inline markdown links to
  `/posts/<slug>` work anywhere in the body. Typo'd slugs fail the build.
- **Tags**: add `tags: [...]` to show topic chips on the home list and post
  header, each linking to a prerendered `/tags/<tag>` index of matching posts.

`app/posts/post-template/` is a permanent draft you can copy to start a post.

Commit, push to `master`, and Cloudflare Pages builds and deploys it.

You get these automatically, no frontmatter needed:

- **Reading time** — an estimate ("N min read") beside each post's date, from
  a build-time word count of the prose.
- **Table of contents** — a "Contents" box on any post with two or more
  headings; its anchors match the headings' ids.
- **Prev/next navigation** — older/newer neighbor cards at the foot of a post.
- **Archive** — `/archive` lists every post grouped by year (linked in the
  footer).
- **Social cards** — a 1200×630 Open Graph image is generated per post (and a
  site default) at build time and referenced from each page's `og:image`.

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

## GitHub stats

`data/github-stats.json` is a committed snapshot of each referenced repo's
latest release/tag, stars, issues, PRs, contributors, last-push date, and
"commits ahead of each post's pinned sha". `.github/workflows/refresh-github-stats.yml`
refreshes it daily (and on demand via workflow_dispatch), committing only
when something changed — that commit triggers the Cloudflare Pages rebuild
that bakes fresh numbers into the static pages. So the cards stay current
without any push to the blog. Run `bun run refresh:github` locally after
adding a repo to a post.

## Scripts

| Script              | Description                  |
| ------------------- | ---------------------------- |
| `bun run dev`       | Start dev server             |
| `bun run build`     | Build static site + RSS + OG |
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

## Themes

The site ships ten built-in style variants (Editorial, Terminal, Brutalist,
Aurora, Blueprint, Synthwave, Swiss, Nord, Notebook, Ink) plus the Default
look, switchable from the header **Theme** picker. Each variant is one file in
`app/styles/themes/` — a set of `:root[data-theme="<id>"]` overrides (mostly
color variables plus a few decorative rules), inert until the attribute is set
on `<html>` by `app/components/theme-switcher.tsx`.

- **Adding/removing a theme is a file operation.** Drop `app/styles/themes/<id>.css`
  (rules targeting `:root[data-theme="<id>"]` — the filename _is_ the id) and it's
  bundled and listed in the picker automatically; delete the file to remove it.
  `app/styles/themes/index.ts` auto-discovers them with `import.meta.glob`, so
  there's no central list to edit. Themes list alphabetically; the label is the id
  capitalized.

- **First visit** picks a random variant (re-rolled each visit); choosing one
  in the picker saves it to `localStorage` for future visits.
- **`?theme=<id>`** deep-links a specific look (e.g. `?theme=nord`), overriding
  the saved/random choice — handy for sharing.
- The initial theme is applied by a tiny inline script in `<head>` (shares the
  theme list with the picker) so there's no flash before hydration.
- **Default** has a subtle mouse-reactive gradient (`GradientBackground`, ported
  from cameron.tacklind.com); each named theme paints its own background.

## Development tips

- Append `?light` to any URL during development to force light mode.
- Favicons adapt to light/dark mode (`public/favicon-*.svg`).
