# arbitraryshit.com — bespoke static blog

## Goal

A standalone static blog at https://arbitraryshit.com for random little projects.
Posts may include pictures, source code, and small self-contained interactive
elements. Authoring = edit files on disk, commit, push. No web CMS, no branding
effort. Cadence ~weekly.

## Environment / context

- Site repo: `C:\Users\camer\git\Personal\arbitraryshit.com` (this repo) → github.com/cinderblock/arbitraryshit.com
- Base template: `C:\Users\camer\git\Personal Projects\ssg-base` (React Router 8 SPA-mode + full prerender, Bun, Vite 8, Playwright, oxfmt + lefthook)
- Reference stacks: `Personal Projects\cameron.tacklind.com`, list.awesomeled.xyz
- IaC: ops repo (github.com/cinderblock/ops) at `C:\Users\camer\git\Personal Projects\jackson`
  - Zone config already exists: `cloudflare/config/isozilla/arbitraryshit.yaml` (DNS + email routing, **no Pages project yet**)
  - Pages projects declared via `pages:` key on the domain entry; sync CI creates project + custom domain + proxied CNAME
- Bun 1.3.0 on this machine; gh authed as `cinderblock` (ssh)
- Cross-project posting: the system-level skill `arbitraryshit-post` (`~/.claude/skills/arbitraryshit-post/`) lets agents in other projects add a post here. Scaffold via `bun ~/.claude/skills/arbitraryshit-post/scripts/new-post.ts` (local-only, no git — deliberately, so it can't hang on an SSH prompt); sync/commit/push are documented git steps the agent runs itself. Enforces the human-prose rule (omit `--body` → draft placeholder). Gotcha found 2026-07-09: PowerShell process startup was hanging machine-wide (both pwsh 7 and WinPS 5 timed out on trivial commands) while bash/bun were fine — that's why the scaffold is a Bun script, not PowerShell.

## Decisions already made (don't re-ask)

- **Authorship (2026-07-04)**: post prose is human-written by Cameron; AI may edit prose, and may write code/diagrams/components/scaffolding. AI placeholder text must be clearly marked and stay `draft: true` until rewritten. The first post ("Building This Site") is currently such a draft — its prose is AI scaffolding awaiting Cameron's rewrite.
- **Drafts are unlisted, not absent (2026-07-04)**: drafts prerender in production as noindexed unlisted URLs (off home/feed). Forced partly by RR: `ssr:false` fails the build if a route has a loader but zero prerendered paths, so an all-drafts blog must still prerender them. Public repo shows draft contents anyway.

- **Stack**: ssg-base as-is, extended — not Astro/Hugo/etc. User wants bespoke.
- **Deploy**: push to GitHub → **Cloudflare Pages git-connected build+host**
  (`build_command: bun run build`, `build_output_dir: build/client`, branch `master`),
  same as list.awesomeled.xyz. GitHub Actions workflow is CI-only (fmt/typecheck/test), no wrangler deploy.
- **Ops repo**: stage changes locally, show diff, **never commit/push ops without explicit per-change consent**.
- **Site repo**: free to push at will.
- **Posts**: one directory per post `app/posts/<slug>/index.mdx` + colocated images/components. MDX with YAML frontmatter (title, date, description, optional draft).

## Architecture

Scaling invariant: every page view downloads O(1) data regardless of post count (user requirement, 2026-07-04).

- `app/posts/<slug>/index.mdx` — post content; frontmatter is YAML at the top, parsed only by `scripts/posts-fs.ts` (fs + `yaml`), never imported as a module export
- `scripts/posts-fs.ts` — single source of truth for metadata (cwd-relative paths — loaders run from the bundled server build). Consumers: prerender list, RSS generator, route loaders
- `app/lib/posts.server.ts` — loader-side listPosts/getPost (draft-filtered; drafts dev-only)
- Route **loaders run at build time** (`ssr:false` + prerender) → metadata ships as per-route `.data` files + prerendered HTML, zero bytes in JS bundles. Home loader = full list; post loader = own frontmatter only
- `app/lib/posts.ts` — client side: lazy `import.meta.glob` of post bodies → one chunk per post, fetched on view
- `react-router.config.ts` — `prerender()` → `/` + `/posts/<slug>` (drafts excluded)
- Permalinks: `/posts/<folder-name>` prerendered HTML; canonical + og:url from `app/lib/site.ts` (single URL constant, also used by feed); `rehype-slug` gives headings anchor ids for #section deep links
- Repo cards: frontmatter `github: owner/repo` or `{repo, commit}` (full 40-char sha) → auto card under title. Shows: latest release/tag (chip), stars/issues/PRs/contributors, last-activity date ("updated <date>"), and "N commits since" vs the pin. Data: committed `data/github-stats.json`, written by `scripts/refresh-github-stats.ts` (GitHub REST; open_issues_count minus PR search count; contributors via Link-header pagination; releases/latest → tags fallback for latestVersion; pushed_at for lastPushed; compare pin...default_branch for ahead_by). Daily cron workflow `refresh-github-stats.yml` commits only when data changes (fetchedAt ignored in the diff) → CF Pages rebuild refreshes static pages. So cards update ~daily with no blog push. GITHUB_TOKEN pushes don't retrigger Actions but DO trigger CF Pages (separate GitHub App). Refresh is per-repo try/catch: a not-yet-pushed repo is skipped, keeping last-known.
- Post cross-links, three primitives: `builds-on: [slugs]` (directional — "Builds on …" line under the title, automatic "Built on by …" backlink section on the target; for tools built on other tools), `related: [slugs]` (non-directional, symmetric backlinks, deduped against directional links), and inline markdown links to `/posts/<slug>`. Unknown slug = build error; draft slug = silently skipped until published. Resolution in `getPostLinks` (posts.server.ts).
- AI-content marker: `<AiGenerated>` (app/components/ai-generated.tsx) wraps AI-first inline content. Available in all posts with no import — passed as the compiled MDX body's `components` prop (mdx-components.ts) via `<Body components={mdxComponents} />`. Deliberately quiet per Cameron (2026-07-08): tint (`--color-ai-tint`) + left accent (`--color-ai-accent`) + italic prose + tiny "AI" mark + aria-label, NOT a text banner. Used on the first post's demo. Levers if he wants to retune: drop the "AI" mark for pure tint+italics, or swap to a font change.
- Site identity: home subtitle + site footer say "personal blog of Cameron Tacklind" linking cameron.tacklind.com. The reverse link on cameron.tacklind.com (e5c75b0) was reverted at Cameron's request 2026-07-05 (e05cdd3) — "we don't need to link to arbitrary shit yet". Don't re-add without his say-so; the commit is there to revert-revert when he's ready.
- `app/posts/post-template/` — permanent draft: authoring template + dev-only test fixture for drafts/related/repo-card shorthand.
- Syntax highlighting: `@shikijs/rehype` at MDX compile time (zero client JS)
- Interactive elements: plain TSX components imported by the MDX, hydrated client-side
- RSS: `scripts/generate-feed.ts` in `bun run build`, capped at 20 newest
- Future levers when home page HTML itself gets big (hundreds of posts): paginate home / add an archive page. Not needed yet.

## Plan / steps

- [x] Explore ssg-base, cameron.tacklind.com, ops repo conventions
- [x] Scaffold site from ssg-base (copy configs, app shell, favicons, workflow→CI-only)
- [x] MDX pipeline (vite plugin, frontmatter, shiki, mdx.d.ts types)
- [x] Post registry + routes (home list, post page, 404) — metadata via `virtual:posts-meta` vite plugin (`scripts/posts-meta-plugin.ts`), bodies lazy-globbed → one chunk per post
- [x] Sample first post proving image + code + interactive component (`app/posts/building-this-site/`)
- [x] RSS feed generation (`scripts/generate-feed.ts` → `build/client/feed.xml`)
- [x] Playwright tests — 11 passing (chromium)
- [x] fmt / typecheck / build green locally
- [x] Create GitHub repo cinderblock/arbitraryshit.com, push (public, master)
- [x] Stage ops change (pages block in arbitraryshit.yaml); user consented 2026-07-05 ("Yes, push it")
- [x] Ops pushed (ops@956df57); Cloudflare sync CI green incl. verify step — Pages project + apex CNAME live
- [x] SITE LIVE 2026-07-05: https://arbitraryshit.com serves 200 (apex via Pages, www→apex 301, feed.xml 200, draft preview URLs 200 with noindex). First 522 was just "project created, no deployment yet" — the plan-update push triggered the first CF Pages build (git integration worked without manual dashboard steps; "Cloudflare Pages" check-run on the commit confirms).
- [x] FIRST POST PUBLISHED 2026-07-08: Cameron wrote the prose ("Building This Site" — why he built it + 3 fundamentals: prerendered HTML w/ hydration, git source, his voice), AI light-edited, links cinderblock/ssg-base. draft flag removed; pin updated to publish-time HEAD. post-template promoted to the full machinery test fixture (headings/image/code) so machinery tests don't depend on real-post content.
- [x] 2nd post published 2026-07-08: "Jarlid — A New Pandora Desktop App" (cinderblock/jarlid, Tauri; Cameron prose, pinned to 178a202). Hardened refresh-github-stats.ts to skip a not-yet-pushed repo instead of crashing (per-repo try/catch) — was needed because the post was drafted before the repo existed. 2026-07-21: app renamed Pandora Desktop → Jarlid; folder/slug pandora-desktop → jarlid with a `/posts/pandora-desktop → /posts/jarlid` 301 in public/\_redirects (first use of \_redirects on this site); screenshot added. Peer session had committed a first pass (2c536e3) with a colon title, wrong (connector) alt text, and a markdown `![](./x.png)` image that the asset pipeline does NOT process (left a raw ./ src → would 404); fixed to import + &lt;img&gt; per PlugSight. GOTCHA: first `_redirects` only had the bare `/posts/pandora-desktop` line; the trailing-slash `/posts/pandora-desktop/` is NOT auto-normalized by CF Pages — it fell through to the SPA fallback and the client tried to lazy-load the deleted route chunk (module MIME error, blank post). Fixed by adding explicit `/posts/pandora-desktop/` and `/posts/pandora-desktop/*` rules (dbd8110). For future slug renames: always redirect bare + trailing-slash + `/*`. (The separate "jarlid blank" report was a stale pre-deploy browser shell, not a site bug — prose+img are in the prerendered visible DOM; hard refresh fixes it.)
- [ ] (ongoing) ~weekly posts; each: new folder under app/posts/, human prose, optional builds-on/related links, optional github pin.

## Findings / gotchas

- ops `arbitraryshit.yaml` already has: apex `cname: cinderblock.hyper.media` (ttl 60), `www: redirect`, `proxies: test.arbitraryshit.com`, google site verification, email routing `cameron@ → cameron@tacklind.com`.
  **Potential conflict**: the Pages handler auto-emits a proxied CNAME for the custom domain (apex → `<project>.pages.dev`); need to check how that interacts with the existing apex cname entry before staging. Do NOT silently delete the hyper.media record — surface it.
- ssg-base's deploy.yml uses wrangler direct-upload; we deliberately diverge (CF Pages builds).
- With `ssr: false` + `prerender`, route `loader`s still run at build time for prerendered paths — but we avoid loaders entirely (no `.data` fetch failures on unknown paths); post meta comes from the statically-bundled registry.
- Eager `import.meta.glob(..., { import: "frontmatter" })` triggers `INEFFECTIVE_DYNAMIC_IMPORT`: the static import drags every post body into the main chunk. Never statically import MDX modules. (First fixed with a `virtual:posts-meta` vite plugin; replaced 2026-07-04 with build-time route loaders after user flagged bundle growth — loaders are simpler AND keep metadata out of JS entirely. Verified by grepping `build/client/assets/*.js` for frontmatter text: zero hits.)
- RR 8 meta functions receive `loaderData`, not `data` (v7 name).
- With `ssr:false`, loaders only serve paths in the prerender list — and dev enforces it (`SingleFetchNoResultError: No result found for routeId`). Worse: the build FAILS outright ("Invalid route exports found when prerendering with ssr:false") if a loader-bearing route ends up with zero prerendered paths. Resolution: prerender ALL posts including drafts (unlisted + noindex in prod).
- oxfmt mangles MDX `{/* ... */}` comments in .mdx files (rewrites `*` emphasis to `_`, producing invalid syntax). Use YAML `#` comments in frontmatter for author notes instead.
- Root ErrorBoundary logs the underlying error (`console.error("Route error:", ...)`) — it was silently swallowing errors, which made the above brutal to diagnose.
- Editorial policy for published posts lives in CLAUDE.md (repo root): formatting edits free; content edits need Cameron's per-edit call on disclosed-vs-silent revision.
- ssg-base has no `vite-tsconfig-paths`, so the `~/*` tsconfig alias fails at runtime in dev — use relative imports in app code.
- Cold dev server: first MDX+shiki compile can exceed RR's SSR stream timeout → "render was aborted" noise + late client re-render. Harmless (build prerender is complete/fine), but interaction tests must retry clicks until hydration attaches handlers (see `tests/home.spec.ts` "hydrates interactive components").
- YAML parses unquoted `date: 2026-07-04` as a Date object; `scripts/posts-fs.ts` normalizes to string, and post frontmatter uses quoted dates by convention.

## Open questions for the user

1. Ops consent: OK to commit+push the staged `arbitraryshit.yaml` change? It adds the Pages project (git-connected build of cinderblock/arbitraryshit.com) and **replaces the apex CNAME to `cinderblock.hyper.media`** ("I fixed the internet", ttl 60) with the Pages apex CNAME. The old record is left commented in the file. If hyper.media should survive, it needs a subdomain instead.

## Things not to do

- Don't push/commit the ops repo (shared working tree; per-change consent required).
- Don't touch Cloudflare directly (dashboard/API) — everything through ops sync CI.
- Don't copy ssg-base's `bun.lock` — regenerate with the added deps.
