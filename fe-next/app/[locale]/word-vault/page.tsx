import type { Metadata } from 'next';
import { PageClient } from './PageClient';

export const metadata: Metadata = {
  title: 'Word Vault — LexiClash',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function WordVaultPage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale = locale === 'he' ? 'he' : 'en';
  return <PageClient locale={safeLocale} />;
}
