import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { formatDate } from "../lib/posts";
import { listPosts } from "../lib/posts.server";
import { SITE_URL } from "../lib/site";
import type { Route } from "./+types/archive";

// Full post list grouped by year. Runs at build time; ships as prerendered
// data. Stays O(1) per view — the whole list is one prerendered page, not a
// growing client bundle.
export function loader() {
  const posts = listPosts();
  const years = new Map<string, typeof posts>();
  for (const post of posts) {
    const year = post.date.slice(0, 4);
    const group = years.get(year) ?? [];
    group.push(post);
    years.set(year, group);
  }
  return {
    total: posts.length,
    groups: [...years.entries()].map(([year, items]) => ({ year, items })),
  };
}

export const meta: MetaFunction = () => {
  const title = "Archive — ArbitraryShit.com";
  const description = "Every post, by year.";
  return [
    { title },
    { tagName: "link", rel: "canonical", href: `${SITE_URL}/archive` },
    { name: "description", content: description },
  ];
};

export default function Archive({ loaderData }: Route.ComponentProps) {
  const { total, groups } = loaderData;
  return (
    <main className="container">
      <section className="intro-block">
        <h1>Archive</h1>
        <p className="subtitle">
          {total} {total === 1 ? "post" : "posts"}
        </p>
      </section>
      {groups.map(({ year, items }) => (
        <section key={year} className="archive-year" aria-label={year}>
          <h2>{year}</h2>
          <ul className="archive-list">
            {items.map((post) => (
              <li key={post.slug} className="archive-item">
                <Link to={`/posts/${post.slug}`}>{post.title}</Link>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                {post.draft && <span className="draft-badge">draft</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <nav className="post-footer">
        <Link to="/" className="back-link">
          ← Home
        </Link>
      </nav>
    </main>
  );
}
