import type { Metadata } from 'next';
import ScrollShowcaseClient from './ScrollShowcaseClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Internal showcase / design preview — keep it out of the index until signed off.
export const metadata: Metadata = {
  title: 'Scroll Showcase — LexiClash',
  description: 'Apple-style scroll-driven landing prototype for LexiClash.',
  robots: { index: false, follow: false },
};

export default async function ScrollShowcasePage({ params }: PageProps) {
  const { locale } = await params;
  return <ScrollShowcaseClient locale={locale} />;
}
