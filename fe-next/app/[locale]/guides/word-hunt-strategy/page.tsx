import type { Metadata } from 'next';
import { defaultOgImages, defaultOgImageUrl } from '@/lib/seo/defaultOgImage';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import WordHuntStrategyPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';
const SLUG = 'word-hunt-strategy';
const DATE_PUBLISHED = '2026-03-10';

const metaTitles: Record<string, string> = {
  en: 'How to Get Better at Word Hunt — Strategy Guide | LexiClash',
  he: 'איך להשתפר בציד מילים (Word Hunt): טיפים ללוח | LexiClash',
  sv: 'Bli bättre på Word Hunt: strategi för rutnätet | LexiClash',
  ja: 'Word Hunt上達のコツ：文字盤の攻略法 | LexiClash',
  es: 'Cómo mejorar en Word Hunt: guía de estrategia | LexiClash',
};

const metaDescriptions: Record<string, string> = {
  en: 'Get better at Word Hunt: scan the grid on a route, hunt -ING, -ED and -ER endings, and turn one word into five. Plus how LexiClash Word Hunt works.',
  he: 'איך להשתפר ב-Word Hunt: לסרוק את הלוח במסלול, לחפש סיומות כמו ים ו-ות, ולהפוך מילה אחת לחמש. וגם איך עובד ציד המילים של LexiClash.',
  sv: 'Bli bättre på Word Hunt: läs av rutnätet längs en rutt, leta efter ändelser som -en, -ar och -na, och gör ett ord till fem. Plus hur Ordjakt fungerar.',
  ja: 'Word Huntがうまくなるコツ。順路を決めて盤面を見る、語尾から探す、1つの単語を5つに広げる。LexiClashのワードハントの遊び方も紹介します。',
  es: 'Mejora en Word Hunt: recorre la cuadrícula con método, busca terminaciones como -S, -ES o -AR y convierte una palabra en cinco. Y cómo es Caza de palabras.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return {
    title, description,
    openGraph: {
      images: defaultOgImages(locale),
      type: 'article', title, description,
      url: `${SITE_URL}/${locale}/guides/${SLUG}`,
      siteName: 'LexiClash', publishedTime: DATE_PUBLISHED,
    },
    twitter: { images: [defaultOgImageUrl(locale)], card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${locale}/guides/${SLUG}`,
      languages: {
        'x-default': `${SITE_URL}/en/guides/${SLUG}`,
        he: `${SITE_URL}/he/guides/${SLUG}`,
        en: `${SITE_URL}/en/guides/${SLUG}`,
        sv: `${SITE_URL}/sv/guides/${SLUG}`,
        ja: `${SITE_URL}/ja/guides/${SLUG}`,
        es: `${SITE_URL}/es/guides/${SLUG}`,
        ru: `${SITE_URL}/ru/guides/${SLUG}`,
        'en-IL': `${SITE_URL}/en/guides/${SLUG}`,
        'he-IL': `${SITE_URL}/he/guides/${SLUG}`,
        'en-US': `${SITE_URL}/en/guides/${SLUG}`,
        'es-US': `${SITE_URL}/es/guides/${SLUG}`,
        'en-GB': `${SITE_URL}/en/guides/${SLUG}`,
        'en-SE': `${SITE_URL}/en/guides/${SLUG}`,
        'sv-SE': `${SITE_URL}/sv/guides/${SLUG}`,
        'en-JP': `${SITE_URL}/en/guides/${SLUG}`,
        'ja-JP': `${SITE_URL}/ja/guides/${SLUG}`,
        'en-ES': `${SITE_URL}/en/guides/${SLUG}`,
        'es-ES': `${SITE_URL}/es/guides/${SLUG}`,
        'en-MX': `${SITE_URL}/en/guides/${SLUG}`,
        'es-MX': `${SITE_URL}/es/guides/${SLUG}`,
        'en-AU': `${SITE_URL}/en/guides/${SLUG}`,
        'es-AR': `${SITE_URL}/es/guides/${SLUG}`,
        'es-CO': `${SITE_URL}/es/guides/${SLUG}`,
        'ru-RU': `${SITE_URL}/ru/guides/${SLUG}`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function WordHuntStrategyPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  const howToSchema = {
    '@context': 'https://schema.org', '@type': 'HowTo',
    name: content.title, description: content.subtitle,
    url: `${SITE_URL}/${locale}/guides/${SLUG}`,
    datePublished: DATE_PUBLISHED, inLanguage: locale,
    step: content.sections.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1,
      name: s.title || `Step ${i + 1}`, text: s.content.substring(0, 200),
    })),
  };


  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: content.faq.map((item) => ({
      '@type': 'Question', name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  // Safe: all JSON-LD content sourced from static constants in content.ts, not user input
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: `${SITE_URL}/${locale}` },
        { name: 'Guides', url: `${SITE_URL}/${locale}/guides` },
        { name: content.title, url: `${SITE_URL}/${locale}/guides/${SLUG}` },
      ]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <WordHuntStrategyPageClient />
    </>
  );
}
