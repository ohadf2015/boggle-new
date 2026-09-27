import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';
import { todayUtcVariant } from '@/lib/blast/v2/dailyVariant';
import { BlastV2PageClient } from './BlastV2PageClient';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

// Server-rendered per request — the level board carries a daily variant salt,
// so the SSR shell must not be frozen at build time.
export const dynamic = 'force-dynamic';

/**
 * Dedicated Wordfall route (Blast V2) — its own standalone single-player mode,
 * NOT a toggle on `/blast`. `/blast` always serves V1 (and stays in parity with
 * multiplayer); this route always serves the V2 / Wordfall engine.
 *
 * Public + offline-capable: the page renders for everyone (the play code makes
 * no admin assumption — guests resume from localStorage), so the service worker
 * can precache a real shell and a rider can launch Wordfall with no connection.
 * Levels build client-side from the bundled chain packs when offline
 * (see BlastV2PageClient → lib/blast/v2/offlineLevelResolver).
 */
export default async function BlastV2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!VALID_LOCALES.includes(rawLocale as Locale)) {
    notFound();
  }
  const locale = rawLocale as Locale;

  const registry = buildRegistry();
  const levelNumber = 1;
  const variant = todayUtcVariant();
  const level = await getLevelSourceForLevel(levelNumber, locale, registry).resolve(levelNumber, locale, undefined, variant)
    .catch(() => locale !== 'en' ? getLevelSourceForLevel(levelNumber, 'en', registry).resolve(levelNumber, 'en', undefined, variant) : Promise.reject(new Error('no en pack')))
    .catch((error: unknown) => {
      console.error('Failed to load blast v2 level:', error);
      return null;
    });

  if (level) return <BlastV2PageClient level={level} />;
  // No V1 fallback here: this is a dedicated V2 dev route, so a missing pack is
  // a real failure an admin should see (404), not a silent downgrade to V1.
  notFound();
}
