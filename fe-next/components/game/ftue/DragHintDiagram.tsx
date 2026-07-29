'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Tiny self-contained "drag across letters" illustration. Three neo-brutalist
 * mini-tiles with a dot that traces across them — the wordless explainer for
 * "how to play". Pure CSS/SVG (no asset pipeline), RTL-mirrored, and silent
 * under prefers-reduced-motion. See `.mp-coach-trace*` in app/globals.css.
 */
export function DragHintDiagram() {
  const { t, dir } = useLanguage();
  // Localizable 3-letter sample so the demo word reads naturally per language.
  const sample = t('mpCoach.sampleWord', 'CAT');
  const letters = Array.from(sample).slice(0, 3);
  while (letters.length < 3) letters.push('');

  return (
    <div
      data-testid="drag-hint-diagram"
      data-dir={dir}
      className="mp-coach-diagram"
      aria-hidden="true"
    >
      <div className="mp-coach-tiles">
        {letters.map((ch, i) => (
          <span key={i} className="mp-coach-tile">
            {ch}
          </span>
        ))}
      </div>
      <span
        className={dir === 'rtl' ? 'mp-coach-trace mp-coach-trace-rtl' : 'mp-coach-trace'}
      />
    </div>
  );
}
