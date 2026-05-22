import type { Metadata } from 'next';
import Showcase3DClient from './Showcase3DClient';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  // self-canonical + hreflang across all 5 locales (see seo.showcase3d).
  // NOTE: indexable — this is a 3rd landing variant alongside /[locale]; if it's a
  // campaign/AB variant rather than the canonical home, point its canonical at /[locale].
  return generatePageMetadata({ seoKey: 'showcase3d', path: '/showcase-3d', locale });
}

export default async function Showcase3DPage({ params }: PageProps) {
  const { locale } = await params;
  return (
    <>
      <VideoGameJsonLd locale={locale} numberOfPlayers={{ minValue: 1, maxValue: 4 }} />
      <Showcase3DClient locale={locale} />
    </>
  );
}
