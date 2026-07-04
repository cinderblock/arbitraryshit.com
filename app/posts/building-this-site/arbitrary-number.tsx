import { useState } from "react";

export function ArbitraryNumber() {
  const [value, setValue] = useState<number | null>(null);

  return (
    <div className="arbitrary-number">
      <button
        type="button"
        onClick={() => setValue(Math.floor(Math.random() * 1_000_000))}
      >
        Gimme an arbitrary number
      </button>
      <output>{value === null ? "…" : value.toLocaleString()}</output>
      <style>{`
        .arbitrary-number {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: var(--color-surface);
        }
        .arbitrary-number button {
          font: inherit;
          font-weight: 500;
          color: white;
          background: var(--color-primary);
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          cursor: pointer;
        }
        .arbitrary-number button:hover {
          background: var(--color-primary-hover);
        }
        .arbitrary-number output {
          font-family: var(--font-mono);
          font-size: 1.25rem;
        }
      `}</style>
    </div>
  );
}
