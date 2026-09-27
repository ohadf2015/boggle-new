import type { Metadata } from 'next';
import Showcase3DClient from './Showcase3DClient';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { FaqJsonLd } from '@/components/showcase3d/FaqJsonLd';
import { loadTranslation } from '@/translations/loadTranslation';

const PATH = '/free-multiplayer-word-game';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  // Indexable, self-canonical, hreflang x5 (title/description from seo.showcase3d).
  return generatePageMetadata({ seoKey: 'showcase3d', path: PATH, locale });
}

export default async function FreeMultiplayerWordGamePage({ params }: PageProps) {
  const { locale } = await params;
  const t = (await loadTranslation(locale as Parameters<typeof loadTranslation>[0])) as Record<string, unknown>;
  const s = (t?.showcase3d ?? {}) as Record<string, string>;
  const faq = [1, 2, 3, 4, 5, 6]
    .map((i) => ({ question: s[`faqQ${i}`], answer: s[`faqA${i}`] }))
    .filter((f) => f.question && f.answer);
  return (
    <>
      <VideoGameJsonLd locale={locale} numberOfPlayers={{ minValue: 1, maxValue: 4 }} />
      <FaqJsonLd items={faq} locale={locale} path={PATH} />
      <Showcase3DClient locale={locale} />
    </>
  );
}
