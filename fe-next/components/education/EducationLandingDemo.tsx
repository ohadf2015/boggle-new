'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { isAdjacent, wordFromPath } from '@/lib/education/eslCefrDemo';
import { wordsFoundKey } from '@/lib/education/landingDemo';
import { displayDemoWord, landingDemoBoard, landingHintPath } from '@/lib/education/landingDemoBoards';
import { EducationLandingProjector } from './EducationLandingProjector';

const STEP_MS = 240;
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Playable hero board. It traces one word by itself on load so a teacher sees the
 * game working before touching it, then hands over the board. The board is dealt in the
 * visitor's language (landingDemoBoards); no network calls.
 */
export function EducationLandingDemo() {
  const { t, language } = useLanguage();
  const { letters, targets, minLength } = landingDemoBoard(language);
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
      const hint = landingHintPath(language, foundNow);
      setPath([]);
      if (!hint) {
        setWatching(false);
        return;
      }
      setWatching(true);
      const gap = reducedMotion() ? 0 : STEP_MS;
      const word = wordFromPath(landingDemoBoard(language).letters, hint);
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
    [clearTimers, language],
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
    if (next.length >= minLength && targets.includes(word) && !found.includes(word)) {
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
      className="overflow-hidden rounded-neo border-3 border-neo-cream/60 bg-neo-navy-light shadow-hard-lg"
    >
      <EducationLandingProjector youScore={found.length}>
        <p aria-live="polite" className="mb-2 truncate font-neo-display text-xs font-black uppercase tracking-wider text-neo-lime sm:text-sm">
          {watching ? t('eg6Land.demo.watching') : t('eg6Land.demo.yourTurn')}
        </p>
        <div
          dir={language === 'he' ? 'rtl' : 'ltr'}
          className="mx-auto grid max-w-[15rem] gap-1.5 sm:max-w-[17rem] sm:gap-2 lg:max-w-[20rem]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {letters.map((ch, i) => {
            const active = path.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onTile(i)}
                disabled={watching}
                aria-label={ch}
                className={cn(
                  'aspect-square rounded-neo border-2 border-neo-black font-neo-display text-xl font-black shadow-hard-sm sm:text-2xl',
                  'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
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
      </EducationLandingProjector>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-neo-black/60 px-3 py-2.5 sm:px-4">
        <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1.5" aria-live="polite">
          <span className="me-1 text-xs font-bold text-neo-cream/75">
            {t(wordsFoundKey(found.length, language), undefined, {
              count: String(found.length),
              total: String(targets.length),
            })}
          </span>
          {found.map((w) => (
            <span
              key={w}
              aria-label={t('eg6Land.demo.found', undefined, { word: displayDemoWord(w, language) })}
              className="rounded-neo border-2 border-neo-black bg-neo-pink px-1.5 font-neo-display text-xs font-black text-neo-black"
            >
              {displayDemoWord(w, language)}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={replay}
          className="min-h-9 rounded-neo border-2 border-neo-black bg-neo-cyan px-3 font-neo-display text-xs font-black uppercase text-neo-navy shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime"
        >
          {t('eg6Land.demo.replay')}
        </button>
      </div>
    </div>
  );
}

export default EducationLandingDemo;
