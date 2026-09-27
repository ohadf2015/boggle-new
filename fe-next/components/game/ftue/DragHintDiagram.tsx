'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Tiny self-contained "drag across letters" illustration. Three neo-brutalist
 * mini-tiles with a dot that traces across them — the wordless explainer for
 * "how to play". Pure CSS/SVG (no asset pipeline), RTL-mirrored, and silent
 * under prefers-reduced-motion. See `.mp-coach-trace*` in app/globals.css.
 */
export function DragHintDiagram({ word }: { word?: string | null } = {}) {
  const { t, dir } = useLanguage();
  // Trace a word that is genuinely on the player's board when we have one —
  // otherwise the diagram and the card's "Try: X" caption would show two
  // different words, one of which isn't even findable. Falls back to the
  // localizable sample so the demo still reads naturally per language.
  const sample = word || t('mpCoach.sampleWord', 'CAT');
  const letters = Array.from(sample.toUpperCase()).slice(0, 3);
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
