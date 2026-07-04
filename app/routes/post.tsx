import type { ComponentType, LazyExoticComponent } from "react";
import { lazy, Suspense } from "react";
import type { MetaFunction } from "react-router";
import { Link, useParams } from "react-router";
import { formatDate, getPost, getPostBody } from "../lib/posts";

const bodyCache = new Map<string, LazyExoticComponent<ComponentType>>();

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

export const meta: MetaFunction = ({ params }) => {
  const post = params.slug ? getPost(params.slug) : undefined;
  if (!post) return [{ title: "Post Not Found — ArbitraryShit.com" }];
  const title = `${post.title} — ArbitraryShit.com`;
  return [
    { title },
    { name: "description", content: post.description },
    { property: "og:type", content: "article" },
    { property: "og:title", content: post.title },
    { property: "og:description", content: post.description },
    { property: "article:published_time", content: post.date },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: post.title },
    { name: "twitter:description", content: post.description },
  ];
};

export default function Post() {
  const { slug } = useParams();
  const post = slug ? getPost(slug) : undefined;
  const Body = slug ? loadBody(slug) : undefined;

  if (!post || !Body) {
    return (
      <main className="container">
        <section className="hero">
          <h1>404</h1>
          <p className="tagline">Post Not Found</p>
          <Link to="/" className="back-link">
            Go back home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <article className="post">
        <header className="post-header">
          {post.draft && <span className="draft-badge">draft</span>}
          <h1>{post.title}</h1>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </header>
        <div className="post-body">
          <Suspense fallback={null}>
            <Body />
          </Suspense>
        </div>
      </article>
      <nav className="post-footer">
        <Link to="/" className="back-link">
          ← All posts
        </Link>
      </nav>
    </main>
  );
}
