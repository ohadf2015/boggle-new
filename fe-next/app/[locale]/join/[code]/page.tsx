import type { Metadata } from 'next';

const BASE_URL = 'https://www.lexiclash.live';
const OG_IMAGES: Record<string, string> = {
  he: `${BASE_URL}/og-image-he.webp`,
  en: `${BASE_URL}/og-image-en.webp`,
  sv: `${BASE_URL}/og-image-sv.webp`,
  ja: `${BASE_URL}/og-image-ja.webp`,
  es: `${BASE_URL}/og-image-es.webp`,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; code: string }> }): Promise<Metadata> {
  const { locale, code } = await params;
  const ogImage = OG_IMAGES[locale] || OG_IMAGES.en;

  return {
    title: `Join Word Battle ${code} | LexiClash`,
    description: 'You\'ve been invited to a real-time word battle! Join the room and compete with friends in LexiClash.',
    openGraph: {
      type: 'website',
      url: `${BASE_URL}/${locale}/join/${code}`,
      title: `Join Word Battle ${code} | LexiClash`,
      description: 'You\'ve been invited to a real-time word battle! Tap to join and compete with friends.',
      siteName: 'LexiClash',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'LexiClash - Join Multiplayer Word Battle' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Join Word Battle ${code} | LexiClash`,
      description: 'You\'ve been invited to a real-time word battle! Tap to join and compete.',
      images: [ogImage],
    },
    robots: { index: false, follow: false },
  };
}

import JoinWithCodePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default function JoinWithCodePage() {
  return <JoinWithCodePageClient />;
}
