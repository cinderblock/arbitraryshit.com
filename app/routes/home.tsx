import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { formatDate } from "../lib/posts";
import { listPosts } from "../lib/posts.server";
import { SITE_URL } from "../lib/site";
import type { Route } from "./+types/home";

// Runs at build time (and in dev); the post list ships as prerendered data
// for this route only, not as JavaScript.
export function loader() {
  return { posts: listPosts() };
}

export const meta: MetaFunction = () => {
  const title = "ArbitraryShit.com";
  const description =
    "The personal blog of Cameron Tacklind — random little projects, arbitrarily documented. Hardware, software, and whatever else.";
  return [
    { title },
    { tagName: "link", rel: "canonical", href: `${SITE_URL}/` },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${SITE_URL}/` },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
};

export default function Home({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData;
  return (
    <main className="container">
      <section className="intro-block">
        <h1>Arbitrary Shit</h1>
        <p className="subtitle">
          Random little projects, arbitrarily documented.
        </p>
      </section>
      <section aria-label="Posts">
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.slug} className="post-list-item">
              {post.draft && <span className="draft-badge">draft</span>}
              <h2>
                <Link to={`/posts/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="post-meta">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span className="dot-sep" aria-hidden="true">
                  ·
                </span>
                <span>{post.readingMinutes} min read</span>
              </p>
              <p>{post.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
