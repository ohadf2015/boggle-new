import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { SocrativeFreeTierHonestyStrip } from '@/components/education/SocrativeFreeTierHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-socrative';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Socrative Free — 5 Quizzes / 1 Room / 50 Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Socrative Free: pricing publishes 5 Quizzes, 1 Room, 50 students per activity. Distinct from Wayground Basic 20 max storage. LexiClash whole-class free (50) + miss→reteach Live.',
    keywords:
      'lexiclash vs socrative, socrative free 5 quizzes, socrative free alternative, classroom quiz alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Socrative Free — 5 Quizzes / 1 Room / 50 honesty',
      description:
        'Socrative Free: 5 Quizzes · 1 Room · 50 students. LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Socrative comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Socrative Free — 5 / 1 / 50 honesty',
      description: 'Socrative Free: 5 Quizzes · 1 Room · 50 students. LexiClash: whole-class free vocab.',
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
      slug="lexiclash-vs-socrative"
      strip={<SocrativeFreeTierHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-wayground', '/lexiclash-vs-mentimeter', '/lexiclash-vs-kahoot']}
    />
  );
}
