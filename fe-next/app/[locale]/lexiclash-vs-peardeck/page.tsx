import type { Metadata } from 'next';
import { VsFoilPage } from '@/components/seo/VsFoilPage';
import { copies, resolveVsLocale } from './copy';
import { PearDeckTeacherFreeHonestyStrip } from '@/components/education/PearDeckTeacherFreeHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-peardeck';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Pear Deck Teacher Free — Named-Response Honesty (2026) | LexiClash',
    description:
      'LexiClash vs Pear Deck Teacher Free: unlimited sessions/participants, but named student responses only via spreadsheet export or Flashcard Factory hover. Premium Teacher Dashboard shows names, hide/block, Drawing/Draggable, Reflect & Review, Teacher Feedback. LexiClash classroom roster + named feedback on free.',
    keywords:
      'lexiclash vs pear deck, peardeck teacher free named responses, pear deck free alternative, pear deck teacher dashboard premium, whole class vocabulary game',
    openGraph: {
      title: 'LexiClash vs Pear Deck Teacher Free — named-response honesty',
      description:
        'Pear Deck Teacher Free: anonymous projector; names via spreadsheet export. LexiClash: classroom roster + named feedback.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash vs Pear Deck comparison',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Pear Deck Teacher Free — named-response honesty',
      description:
        'Teacher Free: anonymous projector; names via export. LexiClash: roster + named feedback.',
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
      slug="lexiclash-vs-peardeck"
      strip={<PearDeckTeacherFreeHonestyStrip locale={locale} />}
      relatedHrefs={['/lexiclash-vs-classpoint', '/lexiclash-vs-socrative', '/lexiclash-vs-kahoot']}
    />
  );
}
