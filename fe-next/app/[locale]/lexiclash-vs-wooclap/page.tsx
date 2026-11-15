import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { WooclapStarterHonestyStrip } from '@/components/education/WooclapStarterHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wooclap';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Wooclap Starter — 5 Active Questions / 30d Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Wooclap Starter: Help (June 2, 2026) publishes free up to 5 active questions; >5 active in 30 days → upgrade. Active = 3+ responses from unique participants. Pricing: 5 questions per month + Unlimited participants (up to 1000). LexiClash free classroom play without an active-question meter.',
    keywords:
      'lexiclash vs wooclap, wooclap starter 5 active questions, wooclap free alternative, classroom vocabulary game, active question meter',
    openGraph: {
      title: 'LexiClash vs Wooclap Starter — 5 active / 30d honesty',
      description:
        'Wooclap Starter: 5 active questions / 30 days (Help). LexiClash: free classroom vocab without an active-question meter.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Wooclap comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wooclap Starter — 5 active / 30d honesty',
      description: 'Wooclap Starter: 5 active questions / 30d. LexiClash: free classroom, no active-question meter.',
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
      slug="lexiclash-vs-wooclap"
      strip={<WooclapStarterHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-mentimeter', '/lexiclash-vs-nearpod', '/lexiclash-vs-kahoot']}
    />
  );
}
