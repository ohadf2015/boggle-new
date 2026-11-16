import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { ClassPointBasicFreeHonestyStrip } from '@/components/education/ClassPointBasicFreeHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-classpoint';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs ClassPoint Basic Free — 25 seats / 5 Q Honesty (2026) | LexiClash',
    description:
      'LexiClash vs ClassPoint Basic Free: pricing publishes Max 25 class size, 5 Questions per PPT, 5 Question types, 3 Draggable objects, 3 saved classes. LexiClash whole-class free (50) + miss→reteach Live.',
    keywords:
      'lexiclash vs classpoint, classpoint basic free 25, classpoint free alternative, powerpoint classroom quiz alternative, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs ClassPoint Basic Free — 25 seats / 5 Q honesty',
      description:
        'ClassPoint Basic Free: Max 25 · 5 Q/PPT. LexiClash: whole-class free vocab (50) + miss→Live.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs ClassPoint comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs ClassPoint Basic Free — 25 / 5 Q honesty',
      description: 'ClassPoint Basic Free: Max 25 · 5 Q/PPT. LexiClash: whole-class free vocab.',
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
      slug="lexiclash-vs-classpoint"
      strip={<ClassPointBasicFreeHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-socrative', '/lexiclash-vs-wayground', '/lexiclash-vs-kahoot']}
    />
  );
}
