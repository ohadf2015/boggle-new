import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { MentimeterFreeTierHonestyStrip } from '@/components/education/MentimeterFreeTierHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-mentimeter';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Mentimeter Free — 50 Participants/Month Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Mentimeter Free: Help + pricing table publish 50 participants per month (reset on account-creation date; 8-hour grace). Free marketing bullets say Unlimited participants once per month. LexiClash whole-class free (50) + miss→reteach Live.',
    keywords:
      'lexiclash vs mentimeter, mentimeter free 50 participants, mentimeter free alternative, classroom presentation alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Mentimeter Free — 50 participants/month honesty',
      description:
        'Mentimeter Free: 50 participants per month (Help + pricing table). LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Mentimeter comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Mentimeter Free — 50/month honesty',
      description: 'Mentimeter Free: 50 participants/month. LexiClash: whole-class free vocab.',
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
      slug="lexiclash-vs-mentimeter"
      strip={<MentimeterFreeTierHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-nearpod', '/lexiclash-vs-blooket', '/lexiclash-vs-kahoot']}
    />
  );
}
