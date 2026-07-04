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

## Decisions already made (don't re-ask)

- **Stack**: ssg-base as-is, extended — not Astro/Hugo/etc. User wants bespoke.
- **Deploy**: push to GitHub → **Cloudflare Pages git-connected build+host**
  (`build_command: bun run build`, `build_output_dir: build/client`, branch `master`),
  same as list.awesomeled.xyz. GitHub Actions workflow is CI-only (fmt/typecheck/test), no wrangler deploy.
- **Ops repo**: stage changes locally, show diff, **never commit/push ops without explicit per-change consent**.
- **Site repo**: free to push at will.
- **Posts**: one directory per post `app/posts/<slug>/index.mdx` + colocated images/components. MDX with YAML frontmatter (title, date, description, optional draft).

## Architecture

- `app/posts/<slug>/index.mdx` — post content; frontmatter exported by remark-mdx-frontmatter
- `app/lib/posts.ts` — registry: eager glob of frontmatter for listings; lazy glob of components for the post route (code-split per post)
- `app/routes/post.tsx` — dynamic route `posts/:slug`; build-time loader returns frontmatter (drives meta tags); MDX body lazy-loaded
- `react-router.config.ts` — `prerender()` enumerates `app/posts/*` dirs via node:fs → `/`, `/posts/<slug>`, plus 404
- Syntax highlighting: `@shikijs/rehype` at MDX compile time (zero client JS)
- Interactive elements: plain TSX components imported by the MDX, hydrated client-side (SPA mode ships Scripts)
- RSS: `scripts/generate-feed.ts` runs as part of `bun run build`, emits `build/client/feed.xml`

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
- [x] Stage ops change (pages block in arbitraryshit.yaml) — edited in ops working tree, `bun run validate` passes, NOT committed/pushed ← waiting for user consent
- [ ] After consent: user (or authorized session) commits+pushes ops; CI sync creates Pages project + apex CNAME
- [ ] Verify CF Pages build, custom domain, DNS, feed.xml live

## Findings / gotchas

- ops `arbitraryshit.yaml` already has: apex `cname: cinderblock.hyper.media` (ttl 60), `www: redirect`, `proxies: test.arbitraryshit.com`, google site verification, email routing `cameron@ → cameron@tacklind.com`.
  **Potential conflict**: the Pages handler auto-emits a proxied CNAME for the custom domain (apex → `<project>.pages.dev`); need to check how that interacts with the existing apex cname entry before staging. Do NOT silently delete the hyper.media record — surface it.
- ssg-base's deploy.yml uses wrangler direct-upload; we deliberately diverge (CF Pages builds).
- With `ssr: false` + `prerender`, route `loader`s still run at build time for prerendered paths — but we avoid loaders entirely (no `.data` fetch failures on unknown paths); post meta comes from the statically-bundled registry.
- Eager `import.meta.glob(..., { import: "frontmatter" })` triggers `INEFFECTIVE_DYNAMIC_IMPORT`: the static import drags every post body into the main chunk. Fixed with the `virtual:posts-meta` plugin — never statically import MDX modules.
- ssg-base has no `vite-tsconfig-paths`, so the `~/*` tsconfig alias fails at runtime in dev — use relative imports in app code.
- Cold dev server: first MDX+shiki compile can exceed RR's SSR stream timeout → "render was aborted" noise + late client re-render. Harmless (build prerender is complete/fine), but interaction tests must retry clicks until hydration attaches handlers (see `tests/home.spec.ts` "hydrates interactive components").
- YAML parses unquoted `date: 2026-07-04` as a Date object; `scripts/posts-fs.ts` normalizes to string, and post frontmatter uses quoted dates by convention.

## Open questions for the user

1. Ops consent: OK to commit+push the staged `arbitraryshit.yaml` change? It adds the Pages project (git-connected build of cinderblock/arbitraryshit.com) and **replaces the apex CNAME to `cinderblock.hyper.media`** ("I fixed the internet", ttl 60) with the Pages apex CNAME. The old record is left commented in the file. If hyper.media should survive, it needs a subdomain instead.

## Things not to do

- Don't push/commit the ops repo (shared working tree; per-change consent required).
- Don't touch Cloudflare directly (dashboard/API) — everything through ops sync CI.
- Don't copy ssg-base's `bun.lock` — regenerate with the added deps.
