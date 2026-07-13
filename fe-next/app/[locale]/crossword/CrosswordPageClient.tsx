'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateDailyPuzzle, generateFreeplayPuzzle } from '@/lib/crossword/generate.daily';
import { loadStreak, persistSolve, type StreakState, emptyStreak } from '@/lib/crossword/streak';
import type { CrosswordPuzzle, Difficulty, PuzzleLocale } from '@/lib/crossword/types';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { CrosswordLoader } from '@/components/crossword/CrosswordLoader';

// Client-only: the view pulls in pixi.js + gsap on demand.
const CrosswordView = dynamic(
  () => import('@/components/crossword/CrosswordView').then((m) => m.CrosswordView),
  { ssr: false },
);

function todayISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

// Cache the generated daily so a mid-solve refresh keeps the SAME grid (and is instant) — and a
// deploy that changes the generator can't pull the rug out from under an in-progress solver.
const dailyCacheKey = (date: string, locale: PuzzleLocale) =>
  `lexiclash:crossword:daily:${locale}:${date}`;
const FREEPLAY_COUNT_KEY = 'lexiclash:crossword:freeplayCount';

function readDailyCache(date: string, locale: PuzzleLocale): CrosswordPuzzle | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(dailyCacheKey(date, locale));
    return raw ? (JSON.parse(raw) as CrosswordPuzzle) : null;
  } catch {
    return null;
  }
}

function writeDailyCache(date: string, locale: PuzzleLocale, puzzle: CrosswordPuzzle): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(dailyCacheKey(date, locale), JSON.stringify(puzzle));
  } catch {
    /* storage full — daily just regenerates next visit (still deterministic) */
  }
}

function nextFreeplayCount(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const n = Number(window.localStorage.getItem(FREEPLAY_COUNT_KEY) ?? '0') + 1;
    window.localStorage.setItem(FREEPLAY_COUNT_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

interface Edition {
  isDaily: boolean;
  label: string;
}

export function CrosswordPageClient({ locale }: { locale: PuzzleLocale }) {
  const { t, language } = useLanguage();
  const today = useMemo(() => todayISO(), []);

  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [edition, setEdition] = useState<Edition>({ isDaily: true, label: '' });
  const [streak, setStreak] = useState<StreakState>(emptyStreak());
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<boolean>(false);
  const seqRef = useRef(0); // guards against out-of-order async results

  const dailyEditionLabel = useMemo(() => {
    try {
      const [y, m, d] = today.split('-').map(Number);
      return new Intl.DateTimeFormat(language || locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(y, m - 1, d)));
    } catch {
      return today;
    }
  }, [today, language, locale]);

  // Initial load: today's daily (from cache if present, else generated + cached).
  useEffect(() => {
    let cancelled = false;
    const seq = ++seqRef.current;
    setGenerating(true);
    setGenError(false);
    (async () => {
      try {
        const cached = readDailyCache(today, locale);
        const p = cached ?? (await generateDailyPuzzle(today, locale));
        if (!p) throw new Error('no puzzle generated');
        if (!cached) writeDailyCache(today, locale, p);
        if (cancelled || seq !== seqRef.current) return;
        setPuzzle(p);
        setEdition({ isDaily: true, label: dailyEditionLabel });
        setStreak(loadStreak());
      } catch {
        if (cancelled || seq !== seqRef.current) return;
        setGenError(true);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today, locale, dailyEditionLabel]);

  const handleNewPuzzle = useCallback(
    (difficulty?: Difficulty) => {
      const seq = ++seqRef.current;
      setGenerating(true);
      setGenError(false);
      const count = nextFreeplayCount();
      // Yield a frame so the (compositor-animated) loader paints before the synchronous fill runs.
      setTimeout(() => {
        void (async () => {
          try {
            const seed = count * 2654435761; // spread counters across the seed space
            const p = await generateFreeplayPuzzle(seed, locale, difficulty);
            if (seq !== seqRef.current) return;
            if (p) {
              setPuzzle(p);
              setEdition({ isDaily: false, label: t('crossword.freeplayEdition', { count }) });
            } else {
              setGenError(true);
            }
          } catch {
            if (seq !== seqRef.current) return;
            setGenError(true);
          } finally {
            setGenerating(false);
          }
        })();
      }, 16);
    },
    [locale, t],
  );

  const handleDailySolved = useCallback(() => {
    setStreak(persistSolve(today));
  }, [today]);

  if (genError) {
    return (
      <main className="min-h-dvh bg-neo-navy texture-halftone flex items-center justify-center p-6">
        <div className="bg-neo-navy-light border-neo border-black rounded-neo shadow-hard px-8 py-7 text-center max-w-xs w-full">
          <p className="font-neo-display font-bold text-neo-white text-lg mb-1">{t('common.error')}</p>
          <p className="font-neo-body text-sm text-neo-white/70 mb-4">{t('common.errorOccurred')}</p>
          <button
            type="button"
            onClick={() => handleNewPuzzle()}
            className="font-neo-display font-bold bg-neo-cyan text-neo-navy border-neo border-black rounded-neo shadow-hard px-5 py-2.5 active:translate-y-[1px] active:shadow-hard-pressed"
          >
            {t('common.retry')}
          </button>
        </div>
      </main>
    );
  }

  if (!puzzle) {
    return <CrosswordLoader label={t('crossword.generating')} />;
  }

  return (
    <main className="min-h-dvh bg-neo-navy texture-halftone">
      {generating && <CrosswordLoader label={t('crossword.generating')} overlay />}
      <CrosswordView
        key={puzzle.id}
        puzzle={puzzle}
        edition={edition.label}
        isDaily={edition.isDaily}
        streak={streak.current}
        onNewPuzzle={handleNewPuzzle}
        onDailySolved={handleDailySolved}
      />
      <ModeCoach mode="crossword" />
    </main>
  );
}
