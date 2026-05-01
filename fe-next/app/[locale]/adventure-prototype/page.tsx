import type { Metadata } from 'next';
import { PageClient } from './PageClient';

export const metadata: Metadata = {
  title: 'Adventure Prototype — LexiClash',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdventurePrototypePage({ params }: PageProps) {
  const { locale } = await params;
  // Only en + he supported in prototype
  const safeLocale = locale === 'he' ? 'he' : 'en';
  return <PageClient locale={safeLocale} />;
}
