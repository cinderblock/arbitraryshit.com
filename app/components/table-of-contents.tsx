// A compact in-page table of contents, rendered near the top of a post.
// Shows h2/h3 only, and only when there are at least two of them — short
// posts get nothing. Ids come from the build-time heading extraction, so the
// #anchors match rehype-slug's.
export function TableOfContents({
  headings,
}: {
  headings: { depth: number; text: string; id: string }[];
}) {
  const items = headings.filter((h) => h.depth === 2 || h.depth === 3);
  if (items.length < 2) return null;
  return (
    <nav className="post-toc" aria-label="Table of contents">
      <p className="post-toc-title">Contents</p>
      <ol>
        {items.map((h) => (
          <li key={h.id} className={h.depth === 3 ? "post-toc-sub" : undefined}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
