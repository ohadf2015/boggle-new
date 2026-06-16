import { notFound } from 'next/navigation';
import { canSeeInWorkModesSession } from '@/lib/auth/canSeeInWorkModesSession';
import type { PuzzleLocale } from '@/lib/crossword/types';
import { CrosswordPageClient } from './CrosswordPageClient';

const VALID_LOCALES: PuzzleLocale[] = ['en', 'he', 'sv', 'ja', 'es'];

// Admin gating reads the cookie session, so this route is never statically cached.
export const dynamic = 'force-dynamic';

/**
 * Crossword — IN-WORK mode (for now). Real route-level gate: visible to admins
 * AND beta testers; everyone else (incl. signed-out) gets a 404 regardless of
 * whether the hub card is shown. EN + HE content today; other locales fall back
 * to EN puzzles. See docs/2026-06-06-crossword-mode-spec.md.
 */
export default async function CrosswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!VALID_LOCALES.includes(rawLocale as PuzzleLocale)) notFound();
  if (!(await canSeeInWorkModesSession())) notFound();
  return <CrosswordPageClient locale={rawLocale as PuzzleLocale} />;
}
