import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';
import { todayUtcVariant } from '@/lib/blast/v2/dailyVariant';
import { BlastV2PageClient } from './v2/BlastV2PageClient';
import BlastLegacyPageClient from './legacy/PageClient';

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

  // V2 is now the default. `?v2=off` opts back into legacy V1.
  // (Previously gated by a Supabase auth allowlist — removed for perf: 50-200ms
  // network roundtrip per page-load just to check a 1-email list.)
  const explicitOptOut = resolvedSearch?.v2 === 'off';
  const useV2 = !explicitOptOut;

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
