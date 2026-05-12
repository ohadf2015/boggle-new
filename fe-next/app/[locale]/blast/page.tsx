import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/blast/v2/types';
import { buildRegistry } from '@/lib/blast/v2/level-source-registry';
import { BlastV2PageClient } from './v2/BlastV2PageClient';
import BlastLegacyPageClient from './legacy/PageClient';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export default async function BlastPage({ params }: { params: { locale: string } }) {
  if (!VALID_LOCALES.includes(params.locale as Locale)) {
    notFound();
  }

  const locale = params.locale as Locale;

  // TODO: Wire flag gate. For now, always show v2.
  // const flagValue = usePostHogFlag<string>('blast.v2', 'control');
  // const useV2 = flagValue === 'v2';

  const useV2 = true;

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
