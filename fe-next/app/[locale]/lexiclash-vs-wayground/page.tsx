import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { WaygroundStarterLimitHonestyStrip } from '@/components/education/WaygroundStarterLimitHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wayground';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Wayground (Quizizz) — Free Classroom Vocab, No 20-Max Cap (2026) | LexiClash',
    description:
      'LexiClash vs Wayground Basic: free classroom vocab without the 20 max activity storage ceiling. Plans page “20 max” + Starter help “Store up to 20 resources” (Updated 12 May 2026). Distinct from Mentimeter / Wooclap / Nearpod / Blooket / Gimkit foils.',
    keywords:
      'lexiclash vs wayground, wayground alternative, quizizz alternative, wayground basic 20 max, wayground starter 20 activity limit, free quizizz alternative, classroom vocabulary games, reteach live',
    openGraph: {
      title: 'LexiClash vs Wayground Basic — No 20 max activity storage cap',
      description:
        'Wayground Basic plans list “20 max” activity storage. LexiClash free classroom vocab has no 20-resource ceiling.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Wayground comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wayground — Free classroom foil',
      description: 'No 20 max activity storage ceiling. Free classroom vocab + reteach Live.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  return (
    <VsFoilPage
      locale={locale}
      copy={copies[resolveVsLocale(locale)]}
      slug="lexiclash-vs-wayground"
      strip={<WaygroundStarterLimitHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-mentimeter', '/lexiclash-vs-wooclap', '/lexiclash-vs-nearpod', '/lexiclash-vs-blooket', '/lexiclash-vs-gimkit']}
    />
  );
}
