import { notFound } from 'next/navigation';
import { isAdminSession } from '@/lib/auth/isAdminSession';
import type { PuzzleLocale } from '@/lib/crossword/types';
import { CrosswordPageClient } from './CrosswordPageClient';

const VALID_LOCALES: PuzzleLocale[] = ['en', 'he', 'sv', 'ja', 'es'];

// Admin gating reads the cookie session, so this route is never statically cached.
export const dynamic = 'force-dynamic';

/**
 * Crossword — ADMIN-ONLY mode (for now). Real route-level gate: non-admins and signed-out
 * users get a 404 regardless of whether the hub card is shown. EN + HE content today; other
 * locales fall back to EN puzzles. See docs/2026-06-06-crossword-mode-spec.md.
 */
export default async function CrosswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!VALID_LOCALES.includes(rawLocale as PuzzleLocale)) notFound();
  if (!(await isAdminSession())) notFound();
  return <CrosswordPageClient locale={rawLocale as PuzzleLocale} />;
}
