import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry } from '@/lib/blast/v2/level-source-registry';
import { BlastV2PageClient } from './v2/BlastV2PageClient';
import BlastLegacyPageClient from './legacy/PageClient';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

const BLAST_V2_TESTERS = new Set<string>(['ohadf2015@gmail.com']);

export default async function BlastPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { v2?: string };
}) {
  if (!VALID_LOCALES.includes(params.locale as Locale)) {
    notFound();
  }
  const locale = params.locale as Locale;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  const isTester = email != null && BLAST_V2_TESTERS.has(email);
  const explicitOptOut = searchParams?.v2 === 'off';
  const useV2 = isTester && !explicitOptOut;

  if (useV2) {
    const registry = buildRegistry();
    const level = await registry.curated.resolve(1, locale).catch((error: unknown) => {
      console.error('Failed to load level:', error);
      return null;
    });
    if (!level) notFound();
    return <BlastV2PageClient level={level} />;
  }

  return <BlastLegacyPageClient />;
}
