import { useEffect } from "react";

/**
 * Subtle mouse-reactive gradient for the Default theme, ported from
 * cameron.tacklind.com. Three radial spots (positioned via CSS vars in
 * global.css) drift away from the cursor with a light spring.
 *
 * Only animates when no `data-theme` is active — each variant paints its own
 * background — and stays put under `prefers-reduced-motion`. Renders nothing;
 * the gradient itself is the `:root:not([data-theme]) body::before` layer.
 */

const SPOTS = [
  { baseX: 25, baseY: 0 },
  { baseX: 75, baseY: 15 },
  { baseX: 50, baseY: 85 },
];
const ALPHA = 0.002;
const BETA = 0.0004;

export function GradientBackground() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let mouseX = 50;
    let mouseY = 50;
    let frameId = 0;
    let running = false;
    const state = SPOTS.map((s) => ({ x: s.baseX, y: s.baseY, vx: 0, vy: 0 }));

    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 100;
      mouseY = (e.clientY / window.innerHeight) * 100;
    };

    const animate = () => {
      const style = root.style;
      for (let i = 0; i < SPOTS.length; i++) {
        const { baseX, baseY } = SPOTS[i];
        const s = state[i];

        // Repulsion target: spot pushed away from the cursor.
        const dx = baseX - mouseX;
        const dy = baseY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = 600 / (dist + 8);
        const targetX = baseX + (dx / (dist + 1)) * force;
        const targetY = baseY + (dy / (dist + 1)) * force;

        // Predictive corrector for a smooth, springy settle.
        const predX = s.x + s.vx;
        const predY = s.y + s.vy;
        const resX = targetX - predX;
        const resY = targetY - predY;
        s.x = predX + ALPHA * resX;
        s.y = predY + ALPHA * resY;
        s.vx += BETA * resX;
        s.vy += BETA * resY;

        style.setProperty(`--gx${i + 1}`, `${s.x}%`);
        style.setProperty(`--gy${i + 1}`, `${s.y}%`);
      }
      frameId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      window.addEventListener("mousemove", onMove);
      frameId = requestAnimationFrame(animate);
    };

    const stop = () => {
      running = false;
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frameId);
    };

    // Animate only for the Default theme; react to live theme switches.
    const sync = () => {
      if (root.dataset.theme) stop();
      else start();
    };

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    sync();

    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  return null;
}
