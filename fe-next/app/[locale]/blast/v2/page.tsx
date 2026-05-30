import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';
import { todayUtcVariant } from '@/lib/blast/v2/dailyVariant';
import { isAdminSession } from '@/lib/auth/isAdminSession';
import { BlastV2PageClient } from './BlastV2PageClient';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

// Server-rendered per request — admin gating reads the cookie session, so this
// route can never be statically cached/prerendered.
export const dynamic = 'force-dynamic';

/**
 * Dedicated Blast V2 route — its own standalone ADMIN-ONLY mode, NOT a toggle
 * on `/blast`. `/blast` always serves V1 (and stays in parity with multiplayer);
 * this route always serves the V2 single-player engine.
 *
 * Admin enforcement is real, not cosmetic: non-admins (and signed-out users)
 * get a 404 here, regardless of whether the hub card is surfaced. The card is
 * only a discovery convenience for admins.
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
  // Hard gate: V2 is admin-only at the route level, not just hidden from the hub.
  if (!(await isAdminSession())) {
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
