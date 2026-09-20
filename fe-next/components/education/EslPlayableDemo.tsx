'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  CEFR_LEVELS,
  DEMO_ROUND_SECONDS,
  type CefrLevel,
  cefrGlosses,
  demoBoard,
  isAdjacent,
  isTargetWord,
  playableCopy,
  practiceHref,
  wordFromPath,
} from '@/lib/education/eslCefrDemo';

const PAGE = '/education/esl-word-games';

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function EslPlayableDemo({ locale }: { locale: string }) {
  const copy = playableCopy(locale);
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [started, setStarted] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEMO_ROUND_SECONDS);
  const [path, setPath] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const board = demoBoard(level);
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const current = wordFromPath(board.letters, path);
  const list = useMemo(() => cefrGlosses(level), [level]);
  // Spanish-speaking teachers read the Spanish gloss; everyone else gets the
  // simple English learner definition.
  const glossOf = (g: { en: string; es: string }) => (locale === 'es' ? g.es : g.en);

  // The round clock. One timeout per tick (not an interval) so a paused tab
  // cannot fire a burst of decrements when it wakes.
  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      setStarted(false);
      setRoundOver(true);
      trackGrowthEvent('edu_page_play_demo_completed', { cefr: level, found: found.length, page: PAGE });
      return;
    }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [started, timeLeft, level, found.length]);

  const pickLevel = (next: CefrLevel) => {
    setLevel(next);
    setStarted(false);
    setRoundOver(false);
    setTimeLeft(DEMO_ROUND_SECONDS);
    setPath([]);
    setFound([]);
    trackGrowthEvent('esl_list_used', { cefr: next, page: PAGE });
  };

  const start = () => {
    setStarted(true);
    setRoundOver(false);
    setTimeLeft(DEMO_ROUND_SECONDS);
    setPath([]);
    setFound([]);
    trackGrowthEvent('edu_page_play_demo_started', { cefr: level, page: PAGE });
  };

  const onTile = (i: number) => {
    if (!started) return;
    setPath((prev) => {
      if (prev.length === 0) return [i];
      if (prev[prev.length - 1] === i) return prev.slice(0, -1);
      if (prev.includes(i)) return prev;
      if (isAdjacent(prev[prev.length - 1], i)) return [...prev, i];
      return [i];
    });
  };

  const submit = () => {
    if (current.length < 3) return;
    if (!isTargetWord(level, current) || found.includes(current)) {
      setPath([]);
      return;
    }
    setFound((prev) => [...prev, current]);
    setPath([]);
  };

  return (
    <div
      dir={dir}
      data-testid="esl-playable-demo"
      className="mt-8 rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-5 shadow-hard sm:p-6"
    >
      <div className="flex flex-wrap gap-2">
        {CEFR_LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => pickLevel(lv)}
            className={`rounded-neo border-2 border-neo-black px-3 py-1.5 font-neo-display text-sm font-black ${
              level === lv ? 'bg-neo-cyan text-neo-navy shadow-hard-sm' : 'bg-neo-navy text-neo-white'
            }`}
          >
            {lv}
          </button>
        ))}
      </div>

      <p className="mt-4 font-neo-display text-xs font-black uppercase tracking-widest text-neo-cyan">
        {copy.listLabel}
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {list.map((g) => (
          <li
            key={g.word}
            className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2.5 py-1.5 text-sm text-neo-white"
          >
            <span className="font-bold">{g.word}</span>
            <span className="text-neo-white/70"> — {glossOf(g)}</span>
          </li>
        ))}
      </ul>

      {!started && !roundOver && (
        <button
          type="button"
          onClick={start}
          className="mt-5 rounded-neo border-3 border-neo-black bg-neo-lime px-5 py-3 font-neo-display text-sm font-black uppercase tracking-wider text-neo-navy shadow-hard"
        >
          {copy.start}
        </button>
      )}

      {roundOver && (
        <div className="mt-5">
          <p className="font-neo-display text-sm font-black uppercase tracking-wider text-neo-lime">
            {copy.timesUp}
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-3 rounded-neo border-3 border-neo-black bg-neo-lime px-5 py-3 font-neo-display text-sm font-black uppercase tracking-wider text-neo-navy shadow-hard"
          >
            {copy.playAgain}
          </button>
        </div>
      )}

      {started && (
        <>
          <p
            data-testid="esl-demo-clock"
            className={`mt-4 font-neo-display text-lg font-black tabular-nums ${
              timeLeft <= 10 ? 'text-neo-red' : 'text-neo-white'
            }`}
          >
            {copy.time} {formatClock(timeLeft)}
          </p>
          <div className="mt-3 grid max-w-xs grid-cols-4 gap-2">
            {board.letters.map((letter, i) => {
              const on = path.includes(i);
              return (
                <button
                  key={`${letter}-${i}`}
                  type="button"
                  onClick={() => onTile(i)}
                  className={`grid aspect-square place-items-center rounded-neo border-3 border-neo-black font-neo-display text-lg font-black ${
                    on ? 'bg-neo-lime text-neo-navy shadow-hard-sm' : 'bg-neo-navy text-neo-white'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-xl font-black tracking-[0.2em] text-neo-white">
            {current || '—'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              className="rounded-neo border-2 border-neo-black bg-neo-cyan px-4 py-2 font-neo-display text-xs font-black uppercase text-neo-navy"
            >
              {copy.submit}
            </button>
            <button
              type="button"
              onClick={() => setPath([])}
              className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-4 py-2 font-neo-display text-xs font-black uppercase text-neo-white"
            >
              {copy.clear}
            </button>
          </div>
        </>
      )}

      {found.length > 0 && (
        <p className="mt-3 text-sm font-bold text-neo-white/80">
          {copy.found}: {found.map((w) => (
            <span key={w} className="me-2 inline-block text-neo-lime">
              {w}
            </span>
          ))}
        </p>
      )}

      <Link
        href={practiceHref(level, locale)}
        className="mt-5 inline-block font-neo-display text-sm font-black uppercase tracking-widest text-neo-cyan underline underline-offset-4"
      >
        {copy.practice}
      </Link>
    </div>
  );
}
