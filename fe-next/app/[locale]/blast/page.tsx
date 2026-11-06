import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isBlastLocale } from '@/lib/landing/blastPlacement';
import BlastLegacyPageClient from './legacy/PageClient';

// Near-empty game shell (~38 crawlable words, measured 2026-07-02) — noindexed
// after the AdSense "low value content" rejection. /guides/blast-strategy
// carries the indexable Blast content. Page stays fully playable.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function BlastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isBlastLocale(rawLocale)) {
    notFound();
  }
  return <BlastLegacyPageClient />;
}
