import { Link } from "react-router";
import { TagList } from "../components/tag-list";
import { formatDate } from "../lib/posts";
import { listPosts } from "../lib/posts.server";
import { SITE_URL } from "../lib/site";
import { tagSlug } from "../lib/tags";
import type { Route } from "./+types/tag";

// Runs at build time for each prerendered tag (see react-router.config.ts).
// Unknown tags aren't prerendered, so in production they fall through to the
// error boundary. Draft-filtered like the home list.
export function loader({ params }: Route.LoaderArgs) {
  const posts = listPosts().filter((post) =>
    post.tags.some((tag) => tagSlug(tag) === params.tag),
  );
  if (posts.length === 0) throw new Response("Not Found", { status: 404 });
  // Display name: the tag as actually written on the first matching post.
  const name =
    posts[0].tags.find((tag) => tagSlug(tag) === params.tag) ?? params.tag;
  return { name, slug: params.tag, posts };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [{ title: "Tag Not Found — ArbitraryShit.com" }];
  const { name } = loaderData;
  const title = `Posts tagged "${name}" — ArbitraryShit.com`;
  return [
    { title },
    {
      tagName: "link",
      rel: "canonical",
      href: `${SITE_URL}/tags/${tagSlug(name)}`,
    },
    { name: "description", content: `All posts tagged "${name}".` },
  ];
};

export default function Tag({ loaderData }: Route.ComponentProps) {
  const { name, posts } = loaderData;
  return (
    <main className="container">
      <section className="intro-block">
        <p className="eyebrow">Tag</p>
        <h1>{name}</h1>
        <p className="subtitle">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </section>
      <section aria-label={`Posts tagged ${name}`}>
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
              <TagList tags={post.tags} />
            </li>
          ))}
        </ul>
      </section>
      <nav className="post-footer">
        <Link to="/" className="back-link">
          ← All posts
        </Link>
      </nav>
    </main>
  );
}
