import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { PadletNeonFreeHonestyStrip } from '@/components/education/PadletNeonFreeHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-padlet';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Padlet Neon Free — 3 Padlets + 20MB Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Padlet Neon Free: 3 active padlets + 20MB upload/file (1 user, 2-min video / 5-min audio). Platinum = unlimited padlets + 500MB. LexiClash whole-class free vocab (50) — no 3-board Neon Free gate.',
    keywords:
      'lexiclash vs padlet, padlet neon free 3 padlets, padlet 20MB upload limit, padlet free alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Padlet Neon Free — 3 padlets + 20MB honesty',
      description:
        'Padlet Neon Free: 3 active padlets + 20MB/file. LexiClash: whole-class free vocab (50).',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Padlet comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Padlet Neon Free — 3 padlets + 20MB honesty',
      description:
        'Neon Free: 3 active padlets + 20MB/file. LexiClash: whole-class free (50).',
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
      slug="lexiclash-vs-padlet"
      strip={<PadletNeonFreeHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-peardeck', '/lexiclash-vs-nearpod', '/lexiclash-vs-kahoot']}
    />
  );
}
