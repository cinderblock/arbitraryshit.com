/**
 * Theme registry — auto-discovered from the CSS files in this folder.
 *
 * Add a theme:    drop `<id>.css` here whose rules target
 *                 `:root[data-theme="<id>"]` — the filename IS the id. It's
 *                 bundled and listed in the picker automatically; no other edits.
 * Remove a theme: delete its `.css` file.
 *
 * The eager glob does double duty: it (a) imports every theme's CSS as a side
 * effect and (b) yields the id list below. Themes are ordered alphabetically by
 * id; the label is the id with its first letter capitalized.
 *
 * Specificity note: global.css's dark-mode block uses
 * `:root:not([data-force-light])` (0,2,0). Each theme's `:root[data-theme="…"]`
 * matches that (0,2,0) and wins because these files are imported after
 * global.css (see the import order in root.tsx).
 */

const modules = import.meta.glob("./*.css", { eager: true });

export type ThemeMeta = { id: string; label: string };

export const THEMES: ThemeMeta[] = Object.keys(modules)
  .map((path) => path.slice(2, -4)) // "./editorial.css" -> "editorial"
  .sort()
  .map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }));

export const THEME_IDS: string[] = THEMES.map((t) => t.id);
