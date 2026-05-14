import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry, getLevelSourceForLevel } from '@/lib/blast/v2/level-source-registry';
import { BlastV2PageClient } from './v2/BlastV2PageClient';
import BlastLegacyPageClient from './legacy/PageClient';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

const BLAST_V2_TESTERS = new Set<string>(['ohadf2015@gmail.com']);

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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  const isTester = email != null && BLAST_V2_TESTERS.has(email);
  const explicitOptOut = resolvedSearch?.v2 === 'off';
  const devForceV2 = resolvedSearch?.v2 === 'force' && process.env.NODE_ENV !== 'production';
  const useV2 = (isTester || devForceV2) && !explicitOptOut;

  if (useV2) {
    const registry = buildRegistry();
    const levelNumber = 1;
    const level = await getLevelSourceForLevel(levelNumber, locale, registry).resolve(levelNumber, locale)
      .catch(() => locale !== 'en' ? getLevelSourceForLevel(levelNumber, 'en', registry).resolve(levelNumber, 'en') : Promise.reject(new Error('no en pack')))
      .catch((error: unknown) => {
        console.error('Failed to load blast v2 level:', error);
        return null;
      });
    if (level) return <BlastV2PageClient level={level} />;
    // fall through to legacy if chain/curated pack missing for this locale
  }

  return <BlastLegacyPageClient />;
}
