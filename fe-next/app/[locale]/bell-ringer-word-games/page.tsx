import type { Metadata } from 'next';
import { getBellRingerContent } from './content';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import { ClassroomKeywordLanding } from '@/components/landing/classroom/ClassroomKeywordLanding';
import { LANDING_ART } from '@/components/landing/kit/art';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/bell-ringer-word-games';

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  sv: 'sv_SE',
  ja: 'ja_JP',
  es: 'es_ES',
  ru: 'ru_RU',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;
  const c = getBellRingerContent(locale);

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: 'bell ringer word games, bell ringer activities, ela bell ringers, vocabulary bell ringer, start of class word game, warm up word games, do now word game, morning warm up vocabulary, free bell ringer activities, 5 minute classroom game',
    openGraph: {
      title: c.ogTitle,
      description: c.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/images/education-hero-en.webp`, width: 1200, height: 675, alt: c.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.twitterTitle,
      description: c.twitterDescription,
      images: [`${BASE_URL}/images/education-hero-en.webp`],
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
  const c = getBellRingerContent(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/en${PAGE_PATH}#faq`,
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Education', item: `${BASE_URL}/${locale}/education` },
      { '@type': 'ListItem', position: 3, name: c.metaTitle, item: `${BASE_URL}/${locale}${PAGE_PATH}` },
    ],
  };

  const moreHrefs = [
    `/${locale}/word-games-for-the-classroom`,
    `/${locale}/substitute-teacher-word-games`,
    `/${locale}/education`,
  ];

  return (
    <ClassroomKeywordLanding
      locale={locale}
      c={c}
      jsonLd={[
        { id: 'ld-bellringer-faq', data: faqJsonLd },
        { id: 'ld-bellringer-breadcrumb', data: breadcrumbJsonLd },
      ]}
      strip={<TeacherProCompareCheckoutStrip locale={locale} />}
      primary={{ href: `/${locale}/education/classroom-game`, label: c.ctaStart }}
      secondary={{ href: `/${locale}/education/duels`, label: c.ctaDuels }}
      extra={[{ href: `/${locale}/word-games-for-the-classroom`, label: c.ctaClassroom }]}
      moreHrefs={moreHrefs}
      art={LANDING_ART.brain('')}
    />
  );
}
