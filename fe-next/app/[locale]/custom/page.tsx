import type { Metadata } from 'next';
import { translations } from '@/translations';
import PageClient from './PageClient';

type Locale = keyof typeof translations;

interface PageParams {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const supportedLocales = Object.keys(translations);
  const validLocale = (supportedLocales.includes(locale) ? locale : 'en') as Locale;

  const t = translations[validLocale] as Record<string, any>;
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
