'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getDailyPuzzle } from '@/lib/crossword/puzzles/index';
import type { PuzzleLocale } from '@/lib/crossword/types';

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

export function CrosswordPageClient({ locale }: { locale: PuzzleLocale }) {
  const puzzle = useMemo(() => getDailyPuzzle(todayISO(), locale), [locale]);

  if (!puzzle) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-neo-navy texture-halftone">
      <CrosswordView puzzle={puzzle} />
    </main>
  );
}
