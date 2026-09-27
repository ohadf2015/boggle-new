import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { WordCraftClient } from './WordCraftClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Near-empty game shell (~30 crawlable words) — noindexed 2026-07-02;
  // /word-craft-game is the indexable landing for this mode.
  return generatePageMetadata({ seoKey: 'wordCraft', path: '/word-craft', locale, noIndex: true });
}

export default function WordCraftPage() {
  return <WordCraftClient />;
}
