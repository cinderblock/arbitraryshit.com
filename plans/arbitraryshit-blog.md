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
- Feeds (expanded 2026-08-04, a41d944): `scripts/generate-feed.ts` emits RSS 2.0 + Atom 1.0 + JSON Feed 1.1, site-wide (`/feed.xml`, `/atom.xml`, `/feed.json`) AND per tag (`/tags/<slug>/…` same three). Capped at 20 newest, drafts excluded; items carry tags as categories. Tag pages advertise their own feeds (meta in `tag.tsx`) plus a visible RSS link; site feeds advertised in `root.tsx`. `scripts/verify-feeds.ts` runs last in `bun run build` and fails it on malformed feeds/URLs or a tag page missing feed links — written after a `${SITE_URL}${dirPath}` concat bug produced `arbitraryshit.comtags/ai/feed.xml`; regression-tested by reintroducing the bug.
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

## Theme system (2026-07-22, SHIPPED)

Cameron asked to make the site less plain. Built 10 swappable style variants + a live header picker; Cameron chose to ship the switcher as a permanent feature.

- `app/styles/themes.css` — **10** themes as `:root[data-theme="…"]` overrides (inert until the attribute is set): **editorial** (warm paper serif, drop caps), **terminal** (mono phosphor-green, prompt/cursor/`>` prefixes), **brutalist** (thick black borders, hard offset shadows), **aurora** (glass gradient, sticky blurred header, floating cards), **blueprint** (cyan-on-navy graph grid), **synthwave** (neon 80s glow headings, horizon wash), **swiss** (stark white, red accent bar, tight bold), **nord** (muted slate dark, soft cards), **notebook** (ruled paper, red-pen + highlighter), **ink** (luxe dark serif w/ gold, drop caps). System font stacks — no new deps.
- `app/components/theme-switcher.tsx` — compact `<select>` in the header (`.site-header-right`, before RSS) with a quiet **"AI"** mark reusing the shared `.ai-mark` class (same mark as `<AiGenerated>` — consolidated so the mark can't drift). Sets `data-theme` on `<html>`, persists explicit picks (incl. "" Default) to `localStorage['styleTheme']`, honors `?theme=<id>`. Styled from theme vars → native look in every theme. Exports `THEME_IDS`/`STORAGE_KEY` so the pre-paint script shares one list.
- **Random default**: `root.tsx` `themeInit` inline `<head>` script (ships) picks, in order: `?theme=` param → saved pref → **random variant** (re-rolled each visit, never persisted). Runs pre-paint so no flash. `<html suppressHydrationWarning>` silences the expected data-theme hydration diff.
- `app/components/gradient-background.tsx` — Default theme only: subtle mouse-reactive 3-spot radial gradient ported from cameron.tacklind.com (spring physics via `--gx/--gy` vars). Viewport-fixed layer `:root:not([data-theme]) body::before` in global.css; component animates only when no theme active (MutationObserver), respects `prefers-reduced-motion`, no-ops on touch (no mouse).
- Names use nbsp (`{"Cameron Tacklind"}`) so they don't wrap mid-name — see the [[nbsp-in-names]] preference. Home subtitle's "personal blog of …" clause removed as redundant with the footer.

Gotchas found: (1) CI only runs **chromium** (`--project=chromium`); the firefox `not-found` test fails on the SPA-fallback client-404 even on clean baseline `bb12a81` — pre-existing dev-only quirk, not CI-gated. (2) DANGER: verifying that baseline used a throwaway git worktree with a **junction** to the main `node_modules`; `git worktree remove --force` followed the junction and deleted `.bin` shims from the REAL node_modules (broke `playwright` → "unknown command 'test'"). Fixed with `bun install --frozen-lockfile`. Never junction node_modules into a worktree you'll `--force` remove — remove the junction (`cmd //c rmdir`) FIRST.

Note: `app/styles/style-option-*.css` (minimal/modern/retro/warm) were an earlier abandoned approach from a prior (compacted) session of this same thread — superseded by themes.css, never referenced, deleted 2026-07-22.

## Feature backlog / ideas (brainstorm 2026-07-22, nothing built)

Cameron asked "what advanced features could/should we add?" — captured here so it
survives context. Nothing below is committed or decided; ordering is my
recommendation, not a promise. **Invariant to respect on all of these:** every
page view stays O(1) regardless of post count — do the work at build time, keep
client indexes metadata-only and lazy.

Cameron triaged the remainder 2026-07-24 (tags/archive/prev-next/reading-time/TOC/OG
shipped 2026-07-22, see "Feature implementation" below):

- **TODO WHEN NEEDED — Client-side search**: build when the archive feels long
  (~15+ posts). Build-time `search-index.json` over **metadata only**
  (title/description/tags, NOT bodies), fetched lazily on first keystroke.
  Full-text would break the invariant — don't.
- **TODO WHEN NEEDED — Series/multi-part posts**: build when a multi-part post
  actually exists. `series:` frontmatter key → "Part 2 of N" + sibling nav
  (generalizes `builds-on`).
- **Callouts/admonitions** — explained to Cameron 2026-07-24 (Note/Warning/Tip aside
  boxes as no-import MDX components, quiet styling like `<AiGenerated>`); awaiting
  his yes/no. No current post needs one.
- **SHIPPED 2026-07-24** (approved same day): (a) **SEO/feeds** (a0c77c5) —
  `scripts/generate-sitemap.ts` (sitemap.xml: home/archive/posts/tags, drafts absent,
  lastmod from post dates), `public/robots.txt`, feed.json (JSON Feed 1.1, same items
  as RSS, rel=alternate link), BlogPosting JSON-LD on posts + Blog JSON-LD on home via
  RR's `"script:ld+json"` meta descriptor (verified in prerendered HTML). (b)
  **Site-wide motion** (ffb266e) — app-wide `Link` wrapper (app/components/link.tsx,
  `viewTransition` default; import THIS Link in app code, not react-router's) → fade
  out/rise-in on SPA navs; one-time body page-enter rise (on body so it doesn't replay
  per-nav); hover lifts (chips, post-nav cards), archive-row nudge, back-link gap
  nudge, eased colors/borders, smooth anchor scroll; ONE `prefers-reduced-motion`
  guard kills everything incl. theme animations. All transform/opacity/color — theme-safe.
- **Analytics — LIVE 2026-07-24.** Cameron consented ("yes"); `web_analytics: true`
  in `cloudflare/config/isozilla/arbitraryshit.yaml` pushed as ops@bd94431; sync CI
  green (sync-infra + sync-verify). Beacon verified injected at the edge on the live
  HTML (static.cloudflareinsights.com, token fb9c4e6f…). Zero blog-repo code — CF
  auto-injects. Dashboard: CF → Analytics → Web Analytics.

Comments — **REOPENED 2026-07-22.** Cameron: no forced GitHub account (rules out giscus),
but he IS open to a database. So the live plan is a **self-hosted CF stack** he fully
controls. Nothing built; not yet prioritized ("we'll see what makes sense").

- **Shape:** **D1** (SQLite; comments are relational — slug/parent/ts/author/body) + a
  **Worker** API (`POST /comments`, `GET /comments?post=<slug>`). Post page **lazy-fetches**
  its own thread client-side → static HTML ships zero comments, so it scales with
  comments-on-that-post, not total post count. **Invariant intact.**
- **Infra → ops repo + per-change consent** (Worker + D1 binding + route). First stateful
  backend on the site.
- **Open design decisions (settle before building):** (1) **Identity** — anonymous name
  (spam magnet) / magic-link email / name+optional-email. Lean: name + **Cloudflare
  Turnstile** (free invisible captcha). (2) **Moderation** — live-post+delete vs. approval
  queue; low traffic → live+Turnstile likely enough. (3) **Threading** — flat (simple, fine
  for this volume) vs. nested.
- Zero-infra fallback if he later sours on the DB: **"reply via email / Mastodon / Bluesky"
  footer link** (`mailto:` + social; optional webmentions). Lightweight, not inline threads.

Push notifications of new posts — **SHELVED 2026-07-22.** Web Push needs a subscription
store (Cloudflare KV/D1) = a database + Worker; Cameron: "if it requires a database, not
worth it." Kept here for the record of _why_ it's out, so it isn't re-proposed:

- Would require a service worker → a **real installable PWA** (iOS Safari only delivers
  Web Push to Home-Screen-installed PWAs; Cameron is often on iOS), **plus** VAPID keys +
  a Worker + KV/D1 to store subscriptions and send on publish. First stateful backend on
  the site; ops-repo infra needing per-change consent. All of that is the dealbreaker.
- **The no-infra version of the same want already exists: RSS.** Reader users get new
  posts for free and we store nothing. (ntfy.sh/email would still need a subscriber list.)

## Feature implementation (in progress, started 2026-07-22)

Cameron: "theme changes done. start implementing the features you highlighted."
Implementing the pure-static, no-infra features (comments/push stay parked — need
consent/DB). Each is its own commit. Invariant held: all work is build-time; loader
data ships prerendered, not as client JS. Order + status:

- [x] **Reading time + word count** (d9732d4) — `readingStats()` in posts-fs; FsPost
      `words`/`readingMinutes`; "date · N min read" byline on home + post header.
- [x] **Prev/next post nav** — `getAdjacentPosts()` in posts.server (chronological
      neighbors in listPosts, newest-first so prev index = newer); post loader +
      `.post-nav` older/newer cards above the footer. Draft-in-prod has no neighbors.
- [x] **Tags** — frontmatter `tags: [...]`; `tagSlug()` (app/lib/tags.ts, client-safe);
      `<TagList>` chips on home/post/tag pages; prerendered `/tags/:tag` (routes/tag.tsx).
      Prerender list = tag pages for tags on non-draft posts only, so every tag page has
      ≥1 visible post. Draft (post-template) tags kept overlapping published ones
      (meta/web) so its chips resolve. Added tags to published posts as metadata
      scaffolding — Cameron can retune: plugsight[windows,usb,tools,ai],
      jarlid[desktop-app,music,ai], building-this-site[web,meta]. Build verified: 8 tag
      pages prerendered, shared `ai`/`web`/`meta` pages list all their posts.
      NOTE: pre-existing firefox-only flake on the "unknown post 404" test (dev SPA
      fallback renders generic boundary instead of 404) — confirmed present on base
      commit 244050e, NOT caused by this work; CI retries:2 masks it.
- [x] **Archive page** — `/archive` (routes/archive.tsx), prerendered, posts grouped
      by year; "Archive" link added to the site footer. Draft-filtered. Build verified.
- [x] **Table of contents** — `extractHeadings()`/`getPostHeadings()` in posts-fs
      (strip code fences; slug all headings in order with `github-slugger` — added as
      explicit dep — to match rehype-slug's dedup); `<TableOfContents>` renders h2/h3
      only, only when ≥2. Headings ship via the POST loader only (NOT home/archive/tag
      listings — keeps those from growing with heading count). Build verified: TOC
      anchors byte-match rendered heading ids on post-template; absent on 0-heading
      posts.
- [x] **Auto OG images** — Cameron chose satori + native @resvg/resvg-js (2026-07-22).
      `scripts/generate-og.tsx` (JSX; `react-jsx`) renders a 1200×630 card per post +
      a `default.png`, run last in `bun run build` → `build/client/og/<slug>.png`
      (gitignored build artifact, regenerated each CF Pages build — not committed).
      Font: Inter .woff from `@fontsource/inter` (satori needs ttf/otf/woff, NOT
      woff2/variable). Deps are build-only → devDependencies (satori, @resvg/resvg-js,
      @fontsource/inter). post + home meta add og:image (1200×630) and
      twitter:card=summary_large_image. GOTCHA: can't import from app/lib/posts in the
      Bun-run script — it runs `import.meta.glob` at load (Vite-only) → crashes plain
      Bun; inlined formatDate instead. Build verified: 5 valid PNGs, meta references
      correct.

ALL SIX FEATURES DONE + firefox 404 fixed + tests + README. FIREFOX FIX: the
"unknown post 404" test failed on firefox because the loader's 404 surfaces as a
plain Error (not a Response) in dev with ssr:false, so the ROOT ErrorBoundary showed
"Something went wrong". Fixed by adding a POST-ROUTE ErrorBoundary (app/routes/post.tsx)
that renders "Page Not Found" when the error is a 404 Response OR a non-Response error
(the dev quirk), surfacing other statuses for real failures. Confirmed root cause via a
console probe ("Route error: Error"). Now 87/87 green all browsers. Pushed live 2026-07-22.

## Open questions for the user

1. RESOLVED 2026-07-05 (was stale in this list until 2026-07-24). The ops
   `arbitraryshit.yaml` change (add `pages:` block + comment out the old
   `cinderblock.hyper.media` apex cname in favor of the Pages apex CNAME) was
   consented ("Yes, push it") and pushed as ops@956df57; site live since
   2026-07-05. Nothing pending. Only lingering (optional) thread: the old
   `cinderblock.hyper.media` "I fixed the internet" record was dropped, not
   relocated — if Cameron wants it back, it needs a subdomain (a small,
   separate, consent-gated ops change). He has not asked for this.

## RESOLVED — Cloudflare Pages stopped deploying (2026-07-27 → fixed 2026-08-04)

**Fixed and verified.** After saving the GitHub App repo selection, push
`bf2fcfc` built and deployed (`build/active` → `deploy/success`). Verified
live: all six feed endpoints serve real content types (not the SPA
fallback), and the eight days of stuck content are current. One wrinkle
worth remembering: immediately after the deploy the _new_ URLs still
returned the cached `text/html` fallback that had been cached while they
404'd; a cache-busting query proved the files were fine, and the stale
entries cleared themselves within ~2 minutes.

Historical detail below.

## Cloudflare Pages stopped deploying — root cause (found 2026-08-04)

**The live site is stale: last successful deploy was 2026-07-27 12:37 UTC
(commit `10d0079`).** Everything since — the Jarlid "Update" note, the
PlugSight/tag/theme work committed after that, and the Atom + per-tag feeds
(`a41d944`) — is pushed to GitHub but NOT live.

Evidence:

- The **"Cloudflare Workers and Pages" check-suite is entirely absent** from
  every commit after `10d0079`; that commit has `Cloudflare Pages | success |
2026-07-27T12:37:04Z`. Absence (not failure) means CF is never being told
  about pushes / never starting a build — not a build error.
- `GET /repos/cinderblock/arbitraryshit.com/deployments` returns empty.
- GitHub Actions CI passes on the same commits and runs the identical
  `bun run build`, so the build itself is fine.
- The ops repo still declares the git-connected project
  (`pages: {repo, production_branch: master, build_command, build_output_dir}`)
  and the Cloudflare sync CI passes — so the project, domain, and DNS exist;
  it's the build/git integration that's broken.
- Nothing in ops explains it: the Web Analytics change was 07-24 (before the
  last good deploy) and the 07-28 "moved to a dedicated account" commit is a
  different site (svdsa).
- Caveat: CF's SPA fallback returns **200 + text/html for any missing path**,
  so status codes prove nothing — test for actual content when checking.

**Root cause narrowed 2026-08-04 via the Cloudflare API** (read-only, using
the ops repo's `cloudflare/.env.local` token + `bunx wrangler`; Cameron asked
for this check):

- The Pages project config is **fine**: `source.type: github`,
  `owner/repo: cinderblock/arbitraryshit.com`, `production_branch: master`,
  `deployments_enabled: true`, `production_deployments_enabled: true`,
  `build_config: {build_command: "bun run build", destination_dir: "build/client"}`.
- The deployments list shows **zero attempts after `2026-07-27T12:36:14Z`**
  (`10d0079`) — no failed builds, nothing queued. Every earlier push has a
  `github:push` trigger and `deploy/success`.

So Cloudflare is configured and willing; **GitHub simply stops notifying it
of pushes.** The break is in the "Cloudflare Workers and Pages" GitHub App —
its access to this repo. It broke between 07-27 12:36 and the next push
(07-28 11:27); the 07-28 ops "moved to a dedicated account" commit came
_after_ the first missed push, so it isn't the cause. 12 pushes have been
silently skipped since.

**CAUSE CONFIRMED 2026-08-04 (Cameron):** he switched the "Cloudflare Workers
and Pages" GitHub App from _All repositories_ to _Only select repositories_
and didn't re-add everything. `arbitraryshit.com` was left out, so GitHub
stopped sending it push events. He has since re-added it (selected list is
now `cinderblock/arbitraryshit.com` + `cinderblock/svdsa.org`).

Granting access does **not** retroactively build — a new push is required,
which is what the commit carrying this note is for.

**Resolution 2026-08-04:** the intermediate "re-granting didn't help"
readings below were explained by the settings page never having been
**saved** — the screenshot showed a pending selection. Once Cameron saved
`cinderblock/arbitraryshit.com` + `cinderblock/list.awesomeled.xyz` +
`cinderblock/svdsa.org`, deploys resumed. No stale-installation repair was
needed. **Lesson: this failure mode is completely silent** — no error, no
failed build, no notification; deploys simply stop and the site serves stale
content indefinitely. When a Pages site looks "not updating", check
`GET /accounts/{acct}/pages/projects/{project}/deployments` for the last
attempt before assuming a build problem, and test page _content_ (CF's SPA
fallback returns 200 + text/html for missing files, so status codes lie).

### Guard against a repeat: deploy drift monitor (2026-08-04/05)

So this can't recur silently:

- **This repo** publishes `/build-info.json` (`scripts/generate-build-info.ts`,
  in the `bun run build` chain) naming the commit the deployed site was built
  from — `CF_PAGES_COMMIT_SHA` on Cloudflare, local git otherwise. A `kind`
  field distinguishes it from the SPA-fallback HTML.
- **The ops uptime worker** (`cloudflare/workers/uptime/src/deploy-drift.ts`,
  ops `cbc8272` + `1e0b72e`) compares that against the repo's branch HEAD
  hourly at :23. If the mismatch outlives a 45-minute grace period it pushes
  "⚠️ Deploys stalled". Missing/unavailable data reports "unknown" and stays
  silent; a new push restarts the grace clock; defaults to enabled.
- **Reading HEAD does not use the GitHub API.** The worker has no
  `GITHUB_TOKEN`, and unauthenticated api.github.com calls from Cloudflare's
  shared egress IPs are rate-limited to uselessness — the monitor's first
  deployed run logged "GitHub HEAD unavailable" for exactly that reason. It
  now reads `github.com/OWNER/REPO.git/info/refs` (git smart-HTTP): no auth,
  ~450 bytes, not API-rate-limited. **The existing build-failure monitor uses
  the same unauthenticated API path and may be blind for the same reason —
  worth checking.**
- Known gap: a healthy run logs nothing, so "no log line" is the only
  evidence the check is working. Adding a positive log for the current case
  would make it verifiable at a glance.
- Only `arbitraryshit.com` is watched. Adding another site = drop the same
  build-info script in that repo, then one line in the worker's `deploySites`.

Superseded intermediate finding, kept for the reasoning trail —
**re-granting access appeared insufficient.** With
`arbitraryshit.com` back in the selected list, a real test push (`65c7a63`)
produced: no Cloudflare check-suite on the commit, and no new deployment
(CF still shows 07-27). Additional checks ruled out the obvious suspects —
Cloudflare's stored `repo_id: 1289554527` and `owner_id: 419955` match
GitHub exactly, so it isn't a recreated/renamed repo, and the build config
and branch are right.

Remaining explanation: the Pages project is bound to a **stale GitHub App
installation id** (what happens when the App is removed and reinstalled
rather than edited — GitHub mints a new installation, existing projects keep
pointing at the dead one). That binding is not exposed through the API, so
it can't be confirmed or repaired from the CLI. Fix is in the dashboard:
project → _Settings → Builds & deployments_ → reconnect/re-link the GitHub
repository. `list-awesomeled-xyz` may well need the same treatment once its
repo is re-added to the App.

Blast radius across the account's other Pages projects (checked via API):

| project                                                      | git source                      | effect                                                                                            |
| ------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `arbitraryshit-com`                                          | cinderblock/arbitraryshit.com   | broke 07-27, 13 pushes skipped; re-granted                                                        |
| `list-awesomeled-xyz`                                        | cinderblock/list.awesomeled.xyz | **still blocked** — nothing lost yet (no push since 07-17) but its next push won't deploy         |
| `tomsawyerlabs-com`                                          | TomSawyerLabs/tomsawyerlabs.com | fine — org-owned, separate App installation, CF check still passing                               |
| `cameron-tacklind-com`, `blake-tacklind-com`, `tacklind-com` | none                            | unaffected: no git connection, deployed by wrangler direct-upload from Actions using an API token |

Workers (`uptime`, `ask`, `ddns`, `shs-sports`) are deployed by wrangler from
ops CI, so the App doesn't gate them either. Caveat: this only covers the
Cloudflare account whose token is in `ops/cloudflare/.env.local`; projects in
the separate "dedicated account" (svdsa) aren't visible from here.

Recommendation: add `cinderblock/list.awesomeled.xyz` to the selected list —
or switch back to _All repositories_, which also covers future repos and
avoids repeating this silent-failure mode.

Stopgap (needs per-change authorization; not done): `POST
/accounts/{account}/pages/projects/arbitraryshit-com/deployments` with
`branch=master` makes CF pull and build the latest commit immediately,
bypassing the webhook. Project dashboard:
`https://dash.cloudflare.com/?to=/c5987fbfdbb396ef3121459c26125cc0/pages/view/arbitraryshit-com`

## Things not to do

- Don't push/commit the ops repo (shared working tree; per-change consent required).
- Don't touch Cloudflare directly (dashboard/API) — everything through ops sync CI.
- Don't copy ssg-base's `bun.lock` — regenerate with the added deps.
