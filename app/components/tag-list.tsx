import { Link } from "react-router";
import { tagSlug } from "../lib/tags";

// Renders a post's tags as chips linking to their tag index pages. Shown on
// the home list, post headers, and tag pages.
export function TagList({
  tags,
  className,
}: {
  tags: string[];
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <ul className={`tag-list${className ? ` ${className}` : ""}`}>
      {tags.map((tag) => (
        <li key={tag}>
          <Link to={`/tags/${tagSlug(tag)}`} className="tag-chip">
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
