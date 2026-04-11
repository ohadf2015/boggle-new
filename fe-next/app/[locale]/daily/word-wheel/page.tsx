import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import { PageLoader } from '@/components/ui/PageLoader';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
  params: Promise<{ locale: string }>;
}

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-neo-navy">
    <PageLoader size="lg" text="Loading Word Wheel..." />
  </div>
);

const WordWheelChallenge = dynamicImport(
  () => import('@/components/daily/WordWheelChallenge'),
  { loading: LoadingFallback }
);

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = (await loadTranslation(validLocale)) as Record<string, any>;
  const enT = (await loadTranslation('en')) as Record<string, any>;
  const seo = t?.seo?.daily || enT.seo.daily;

  return {
    title: `${seo.title} - Word Wheel`,
    description: seo.description,
  };
}

/**
 * Word Wheel daily challenge page route
 */
export default function WordWheelPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WordWheelChallenge />
    </Suspense>
  );
}
