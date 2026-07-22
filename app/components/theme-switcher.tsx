import { useEffect, useState } from "react";
import { THEMES } from "../styles/themes";

/**
 * Header theme picker. Style variants are auto-discovered from
 * `app/styles/themes/*.css` (see that folder's index.ts) and activated by
 * `data-theme` on <html>.
 *
 * Initial theme is chosen pre-paint by the inline script in root.tsx (which
 * shares THEME_IDS / STORAGE_KEY), in this order:
 *   1. `?theme=<id>` URL param (deep-link / share a specific look)
 *   2. a saved preference in localStorage
 *   3. otherwise a random theme — re-rolled every visit until one is chosen
 * Only an explicit pick here is saved; the random default is never persisted.
 */

export const STORAGE_KEY = "styleTheme";

function apply(id: string) {
  const root = document.documentElement;
  if (id) root.dataset.theme = id;
  else delete root.dataset.theme;
}

export function ThemeSwitcher() {
  // "" until mounted, then synced to whatever the pre-paint script applied.
  const [active, setActive] = useState("");

  useEffect(() => {
    setActive(document.documentElement.dataset.theme ?? "");
  }, []);

  function choose(id: string) {
    apply(id);
    setActive(id);
    // Persist every explicit choice (including "" Default) so it sticks.
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage may be unavailable (private mode); the pick still applies.
    }
  }

  return (
    <div className="theme-switcher">
      <span className="theme-switcher-label" aria-hidden="true">
        Theme
      </span>
      <select
        aria-label="Theme"
        value={active}
        onChange={(e) => choose(e.target.value)}
      >
        <option value="">Default</option>
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <span className="ai-mark">AI</span>
    </div>
  );
}
