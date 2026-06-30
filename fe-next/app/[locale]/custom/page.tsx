import type { Metadata } from 'next';
import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import PageClient from './PageClient';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface PageParams {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const supportedLocales = ['en', 'he', 'sv', 'ja', 'es'];
  const validLocale = (supportedLocales.includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const title = t.puzzleBrowse?.title || 'Browse Puzzles';
  const description = t.puzzleBrowse?.subtitle || 'Discover and play custom word puzzles created by the community';

  return {
    title: `${title} - LexiClash`,
    description,
    openGraph: {
      title: `${title} - LexiClash`,
      description,
      type: 'website',
    },
  };
}

export default function CustomBrowsePage() {
  return <PageClient />;
}
