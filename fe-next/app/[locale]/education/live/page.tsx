import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SUPPORTED_LOCALES } from '@/lib/localeResolution';
import EduLivePageClient from './EduLivePageClient';
import EduLiveLoading from './loading';

export function generateStaticParams(): Array<{ locale: string }> {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'LexiClash Class',
  robots: { index: false, follow: false },
};

export default function EduLivePage() {
  return (
    <Suspense fallback={<EduLiveLoading />}>
      <EduLivePageClient />
    </Suspense>
  );
}
