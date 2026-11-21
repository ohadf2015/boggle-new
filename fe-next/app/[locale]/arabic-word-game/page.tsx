import type { Metadata } from 'next';
import { ComingSoonLanding } from '@/components/waitlist/ComingSoonLanding';
import { EN_CANONICAL, enContent } from './content';
import { AR_CANONICAL } from '../laabat-kalimat-arabiya/content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = 'Arabic Word Game Online with Friends, Coming Soon | LexiClash';
  const description =
    "LexiClash runs live word battles in the browser in six languages, and Arabic is next. Join the waitlist and we'll email you once when it's ready.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: 'en_US',
      type: 'website',
      url: EN_CANONICAL,
      images: [{ url: 'https://www.lexiclash.live/og-image-en.webp?v=2', width: 1200, height: 630, alt: 'LexiClash' }],
    },
    alternates: {
      canonical: EN_CANONICAL,
      languages: { en: EN_CANONICAL, ar: AR_CANONICAL, 'x-default': EN_CANONICAL },
    },
    robots: { index: locale === 'en', follow: true },
  };
}

export default async function ArabicWordGamePage({ params }: PageProps) {
  await params;
  return <ComingSoonLanding content={enContent} />;
}
