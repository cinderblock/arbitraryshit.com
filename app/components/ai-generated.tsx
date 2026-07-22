import type { ReactNode } from "react";

/**
 * Visibly (but quietly) marks AI-authored content inside an otherwise
 * human-written post, per the site's authorship policy. The signal is mostly
 * visual — a tinted background, an accent edge, and italic prose — plus a
 * small "AI" mark and an accessible label rather than a loud text banner.
 * Available in every post's MDX without an import (app/components/mdx-components.ts).
 */
export function AiGenerated({
  children,
  label = "AI-generated",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <aside className="ai-generated" aria-label={label}>
      <span className="ai-generated-mark ai-mark" aria-hidden="true">
        AI
      </span>
      <div className="ai-generated-body">{children}</div>
    </aside>
  );
}
