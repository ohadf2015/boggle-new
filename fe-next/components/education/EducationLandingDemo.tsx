'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { demoBoard, isAdjacent, isTargetWord, wordFromPath, type CefrLevel } from '@/lib/education/eslCefrDemo';
import { nextHintPath } from '@/lib/education/landingDemo';

const LEVEL: CefrLevel = 'A1';
const STEP_MS = 240;
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Playable hero board. It traces one word by itself on load so a teacher sees the
 * game working before touching it, then hands over the board. Built on the same
 * board and adjacency rules as the ESL demo; no network calls.
 */
export function EducationLandingDemo() {
  const { t } = useLanguage();
  const { letters, targets } = demoBoard(LEVEL);
  const cols = Math.round(Math.sqrt(letters.length));
  const [path, setPath] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [watching, setWatching] = useState(true);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const trace = useCallback(
    (foundNow: string[]) => {
      clearTimers();
      const hint = nextHintPath(LEVEL, foundNow);
      setPath([]);
      if (!hint) {
        setWatching(false);
        return;
      }
      setWatching(true);
      const gap = reducedMotion() ? 0 : STEP_MS;
      const word = wordFromPath(letters, hint);
      hint.forEach((_, step) => {
        timers.current.push(window.setTimeout(() => setPath(hint.slice(0, step + 1)), gap * (step + 1)));
      });
      timers.current.push(
        window.setTimeout(() => {
          setFound((prev) => (prev.includes(word) ? prev : [...prev, word]));
          setPath([]);
          setWatching(false);
        }, gap * (hint.length + 1)),
      );
    },
    [clearTimers, letters],
  );

  useEffect(() => {
    trace([]);
    return clearTimers;
  }, [trace, clearTimers]);

  const onTile = (i: number) => {
    if (watching) return;
    const last = path[path.length - 1];
    let next: number[];
    if (last === i) next = path.slice(0, -1);
    else if (path.includes(i)) return;
    else if (last === undefined || isAdjacent(last, i)) next = [...path, i];
    else next = [i];

    const word = wordFromPath(letters, next);
    if (next.length >= 3 && isTargetWord(LEVEL, word) && !found.includes(word)) {
      setFound([...found, word]);
      setPath([]);
      return;
    }
    setPath(next);
  };

  const replay = () => {
    setFound([]);
    trace([]);
  };

  return (
    <div
      data-testid="education-landing-demo"
      role="group"
      aria-label={t('eg6Land.demo.label')}
      className="rounded-neo border-neo-thick border-neo-cream/60 bg-neo-navy-light p-4 shadow-hard-lg sm:p-5"
    >
      <p aria-live="polite" className="font-neo-display text-sm font-black uppercase tracking-wider text-neo-lime">
        {watching ? t('eg6Land.demo.watching') : t('eg6Land.demo.yourTurn')}
      </p>
      <div
        dir="ltr"
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {letters.map((ch, i) => {
          const order = path.indexOf(i);
          const active = order !== -1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onTile(i)}
              disabled={watching}
              aria-label={ch}
              className={cn(
                'aspect-square rounded-neo border-2 border-black font-neo-display text-2xl font-black shadow-hard-sm transition-transform duration-150 motion-reduce:transition-none',
                active ? 'bg-neo-lime text-neo-navy -translate-y-0.5' : 'bg-neo-cream text-neo-navy',
                !watching && !active && 'hover:-translate-y-0.5',
                'disabled:cursor-default',
              )}
            >
              {ch}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex min-h-9 flex-wrap items-center gap-2" aria-live="polite">
        {found.map((w) => (
          <span
            key={w}
            aria-label={t('eg6Land.demo.found', undefined, { word: w })}
            className="rounded-neo border-2 border-black bg-neo-pink px-2 py-0.5 font-neo-display text-sm font-black text-neo-black"
          >
            {w}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-neo-cream/80">
          {t('eg6Land.demo.wordsFound', undefined, { count: String(found.length) })}
          {' / '}
          {targets.length}
        </p>
        <button
          type="button"
          onClick={replay}
          className="rounded-neo border-2 border-black bg-neo-cyan px-3 py-1.5 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard-sm transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          {t('eg6Land.demo.replay')}
        </button>
      </div>
    </div>
  );
}

export default EducationLandingDemo;
