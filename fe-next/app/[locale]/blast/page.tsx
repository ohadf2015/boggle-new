import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';
import { todayUtcVariant } from '@/lib/blast/v2/dailyVariant';
import { BlastV2PageClient } from './v2/BlastV2PageClient';
import BlastLegacyPageClient from './legacy/PageClient';
import { resolveBlastVersion } from '@/lib/blast/blastVersionSelect';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export default async function BlastPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ v2?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  if (!VALID_LOCALES.includes(rawLocale as Locale)) {
    notFound();
  }
  const locale = rawLocale as Locale;

  // V1 (legacy) is the ONLY Blast version shown to players — it is also the
  // version used in multiplayer, so SP and MP stay in parity. V2 is an opt-in
  // single-player preview reachable only via `?v2=on`.
  const useV2 = resolveBlastVersion(resolvedSearch) === 'v2';

  if (useV2) {
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
    // fall through to legacy if chain/curated pack missing for this locale
  }

  return <BlastLegacyPageClient />;
}
