import type { LazyExoticComponent } from "react";
import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { mdxComponents } from "../components/mdx-components";
import { RepoCard } from "../components/repo-card";
import { getRepoCard } from "../lib/github.server";
import { formatDate, getPostBody, type PostBody } from "../lib/posts";
import { getPost, getPostLinks } from "../lib/posts.server";
import { postUrl } from "../lib/site";
import type { Route } from "./+types/post";

const bodyCache = new Map<string, LazyExoticComponent<PostBody>>();

function loadBody(slug: string) {
  let Body = bodyCache.get(slug);
  if (!Body) {
    const load = getPostBody(slug);
    if (!load) return undefined;
    Body = lazy(load);
    bodyCache.set(slug, Body);
  }
  return Body;
}

// Runs at build time for each prerendered post; each post page fetches only
// its own metadata. Unknown slugs are never prerendered, so in production
// they fall through to the error boundary.
export function loader({ params }: Route.LoaderArgs) {
  const post = getPost(params.slug);
  if (!post) throw new Response("Not Found", { status: 404 });
  return {
    post,
    github: getRepoCard(post),
    links: getPostLinks(post),
  };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [{ title: "Post Not Found — ArbitraryShit.com" }];
  const { post } = loaderData;
  const title = `${post.title} — ArbitraryShit.com`;
  const url = postUrl(post.slug);
  return [
    { title },
    // Drafts are reachable but unlisted; keep them out of search indexes.
    ...(post.draft ? [{ name: "robots", content: "noindex" }] : []),
    { tagName: "link", rel: "canonical", href: url },
    { name: "description", content: post.description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: url },
    { property: "og:title", content: post.title },
    { property: "og:description", content: post.description },
    { property: "article:published_time", content: post.date },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: post.title },
    { name: "twitter:description", content: post.description },
  ];
};

function PostLinkList({
  title,
  links,
  className,
}: {
  title: string;
  links: { slug: string; title: string; date: string }[];
  className: string;
}) {
  if (links.length === 0) return null;
  return (
    <section className={`related ${className}`} aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {links.map((entry) => (
          <li key={entry.slug}>
            <Link to={`/posts/${entry.slug}`}>{entry.title}</Link>
            <time dateTime={entry.date}> — {formatDate(entry.date)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Post({ loaderData }: Route.ComponentProps) {
  const { post, github, links } = loaderData;
  const Body = loadBody(post.slug);

  return (
    <main className="container">
      <article className="post">
        <header className="post-header">
          {post.draft && <span className="draft-badge">draft</span>}
          <h1>{post.title}</h1>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </header>
        {github && <RepoCard github={github} />}
        {links.buildsOn.length > 0 && (
          <p className="builds-on">
            Builds on{" "}
            {links.buildsOn.map((entry, i) => (
              <span key={entry.slug}>
                {i > 0 && ", "}
                <Link to={`/posts/${entry.slug}`}>{entry.title}</Link>
              </span>
            ))}
          </p>
        )}
        <div className="post-body">
          {Body && (
            <Suspense fallback={null}>
              <Body components={mdxComponents} />
            </Suspense>
          )}
        </div>
      </article>
      <PostLinkList
        title="Built on by"
        links={links.builtOnBy}
        className="built-on-by"
      />
      <PostLinkList
        title="Related posts"
        links={links.related}
        className="related-posts"
      />
      <nav className="post-footer">
        <Link to="/" className="back-link">
          ← All posts
        </Link>
      </nav>
    </main>
  );
}
