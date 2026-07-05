# arbitraryshit.com — notes for Claude

This is a personal blog. The repo is public and the git history is the
permanent reference for everything ever published.

## Authorship

Post prose is **human-written** — it's Cameron's voice. AI may:

- edit prose for grammar, clarity, and tightening (editing ≠ authoring),
- write code snippets, interactive components, diagrams, alt text, and
  frontmatter scaffolding,
- draft an outline or placeholder text to structure a post — but only
  clearly marked as placeholder, with `draft: true` set, until Cameron has
  rewritten it in his own words.

Never publish AI-authored prose as a post.

## Editing published posts

- **Formatting/mechanical edits** (typos, whitespace, broken links, code
  style in snippets, CSS) — no ceremony needed, just fix them.
- **Content edits to a published post** (changing what it says, adding or
  removing sections, correcting claims) usually deserve a visible edit
  disclaimer in the post — but this is the author's call, per edit. Ask
  Cameron whether to (a) mark it as an edit in the post, or (b) silently
  revise as if it was always that way. Don't pick for him. Either way the
  git history preserves the truth, which is part of why (b) is acceptable.
- Never rewrite git history to hide a change.

## Publishing model

- Push to `master` = publish (Cloudflare Pages builds `bun run build` from
  this repo). There is no staging environment; drafts (`draft: true`) are
  the staging mechanism — listed in dev, and deployed as unlisted noindexed
  preview URLs in production (off the home page and feed; the public repo
  shows their contents anyway).
- `app/posts/post-template/` is a permanent draft that doubles as the
  authoring template and as test fixture for draft/related machinery. Don't
  publish it or delete it casually.
- `data/github-stats.json` is machine-written by the daily
  refresh-github-stats workflow. Don't hand-edit it; run
  `bun run refresh:github` instead.

## Conventions

- Architecture invariant: every page view downloads O(1) data regardless of
  post count. Post metadata flows through build-time loaders (never into
  client JS); post bodies are one lazy chunk each. Keep it that way.
- Quoted `date:` strings in frontmatter (unquoted YAML dates parse as Date
  objects).
- `bun run fmt` before committing (lefthook enforces it).
- Living plan: `plans/arbitraryshit-blog.md`.
