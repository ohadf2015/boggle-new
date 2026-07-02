import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { PuzzleLocale } from '@/lib/crossword/types';
import { CrosswordPageClient } from './CrosswordPageClient';

const VALID_LOCALES: PuzzleLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

// Client-only shell (~37 crawlable words) not surfaced on the home hub —
// noindexed 2026-07-02 (AdSense low-value-content remediation). Restore when
// crossword ships with a real landing/content surface.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/**
 * Crossword — a fully client-side daily puzzle. The board, clue navigation and
 * check/reveal run with no server, and the daily puzzle is picked client-side
 * from the bundled pool (lib/crossword/puzzles). EN + HE content today; other
 * locales fall back to EN puzzles. See docs/2026-06-06-crossword-mode-spec.md.
 *
 * Public + offline-capable: the route renders a static client shell for everyone
 * so the service worker can precache it and a rider can play it offline.
 */
export default async function CrosswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!VALID_LOCALES.includes(rawLocale as PuzzleLocale)) notFound();
  return <CrosswordPageClient locale={rawLocale as PuzzleLocale} />;
}
