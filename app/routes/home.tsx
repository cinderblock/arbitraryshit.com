import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { formatDate, posts } from "../lib/posts";

export const meta: MetaFunction = () => {
  const title = "ArbitraryShit.com";
  const description =
    "Random little projects, arbitrarily documented. Hardware, software, and whatever else.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
};

export default function Home() {
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
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <p>{post.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
