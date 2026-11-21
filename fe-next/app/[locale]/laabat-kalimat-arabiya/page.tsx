import type { Metadata } from 'next';
import { ComingSoonLanding } from '@/components/waitlist/ComingSoonLanding';
import { AR_CANONICAL, arContent } from './content';
import { EN_CANONICAL } from '../arabic-word-game/content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = 'لعبة كلمات عربية أونلاين مع الأصدقاء، قريبًا | LexiClash';
  const description =
    'LexiClash لعبة كلمات جماعية مجانية في المتصفح: شبكة حروف واحدة للجميع وجولات من دقيقتين إلى ثلاث. نعمل على النسخة العربية، فاترك بريدك لنخبرك فور إطلاقها.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: 'ar_AR',
      type: 'website',
      url: AR_CANONICAL,
      images: [{ url: 'https://www.lexiclash.live/og-image-en.webp?v=2', width: 1200, height: 630, alt: 'LexiClash' }],
    },
    alternates: {
      canonical: AR_CANONICAL,
      languages: { ar: AR_CANONICAL, en: EN_CANONICAL, 'x-default': EN_CANONICAL },
    },
    robots: { index: locale === 'en', follow: true },
  };
}

export default async function ArabicWaitlistPage({ params }: PageProps) {
  await params;
  return <ComingSoonLanding content={arContent} />;
}
