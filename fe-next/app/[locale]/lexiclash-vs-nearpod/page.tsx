import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { NearpodSilverFreeTierHonestyStrip } from '@/components/education/NearpodSilverFreeTierHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-nearpod';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Nearpod Silver — 40 Joins / 300 MB Free Foil (2026) | LexiClash',
    description:
      'LexiClash vs Nearpod Silver free: 40 joins per lesson + 300 MB storage (Gold 75 / Platinum 90 / School 250). LexiClash whole-class free (50) + miss→reteach Live. Cite nearpod.com/pricing.',
    keywords:
      'lexiclash vs nearpod, nearpod silver alternative, nearpod 40 students, nearpod 300 MB, free nearpod alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Nearpod Silver — 40 joins / 300 MB free foil',
      description:
        'Nearpod Silver free: 40 joins per lesson + 300 MB. LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Nearpod comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Nearpod Silver — 40 / 300 MB free foil',
      description: 'Nearpod Silver: 40 joins + 300 MB. LexiClash: whole-class free vocab.',
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
      slug="lexiclash-vs-nearpod"
      strip={<NearpodSilverFreeTierHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-blooket', '/lexiclash-vs-gimkit', '/lexiclash-vs-kahoot']}
    />
  );
}
