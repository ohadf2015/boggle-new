import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import MostPopularWordGamesPageClient from './PageClient';
import { contentByLocale } from './content';
import { faqByLocale } from './faq';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'most-popular-word-games-2026';
const DATE_PUBLISHED = '2026-05-15';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'The Most Popular Online Word Games of 2026 — and Why They Exploded',
  he: 'משחקי המילים הכי פופולריים אונליין ב-2026 — ולמה הם התפוצצו',
  sv: 'De populäraste ordspelen online 2026 — och varför de exploderade',
  ja: '2026年に最も人気のオンラインワードゲーム — そして、なぜ爆発したのか',
  es: 'Los juegos de palabras online más populares de 2026 — y por qué explotaron',
};

const metaDescriptions: Record<string, string> = {
  en: 'A field guide to the most popular online word games of 2026 — Wordle, Connections, Strands, Words With Friends, Netflix Scattergories — and the four forces behind a $3.36 billion boom.',
  he: 'מדריך שטח למשחקי המילים הכי פופולריים אונליין ב-2026 — Wordle, Connections, Strands, Words With Friends, Scattergories של נטפליקס — וארבעת הכוחות מאחורי תעשייה של 3.36 מיליארד דולר.',
  sv: 'En fältguide till de populäraste ordspelen online 2026 — Wordle, Connections, Strands, Words With Friends, Netflix Scattergories — och de fyra krafterna bakom en boom på 3,36 miljarder dollar.',
  ja: '2026年の最も人気のオンラインワードゲームへのフィールドガイド — Wordle、Connections、Strands、Words With Friends、Netflix Scattergories — そして33.6億ドルのブームを支える4つの力。',
  es: 'Una guía de campo de los juegos de palabras online más populares de 2026 — Wordle, Connections, Strands, Words With Friends, Netflix Scattergories — y las cuatro fuerzas detrás de un boom de 3.360 millones de dólares.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({
    slug: SLUG,
    locale,
    title,
    description,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    hasTranslation: locale in metaTitles,
  });
}

export default async function MostPopularWordGamesPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;
  const faqs = faqByLocale[locale] || faqByLocale.en;

  const wordCount = content.sections.reduce(
    (sum, s) => sum + (s.title?.split(/\s+/).length ?? 0) + s.content.split(/\s+/).length,
    0,
  );

  const siteUrl = 'https://www.lexiclash.live';

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${siteUrl}/${locale}` },
          { name: 'Blog', url: `${siteUrl}/${locale}/blog` },
          { name: content.title, url: `${siteUrl}/${locale}/blog/${SLUG}` },
        ]}
      />
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.en}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
        dateModified={DATE_MODIFIED}
        wordCount={wordCount}
        faqItems={faqs}
        keywords="most popular word games 2026, best online word games 2026, most popular online word games, wordle, nyt connections, words with friends, netflix word game, word game trends 2026"
        articleSection="Trends"
        citations={[
          {
            title: 'How Wordle creator Josh Wardle built and sold the viral game',
            url: 'https://techcrunch.com/2022/01/12/josh-wardle-interview-wordle/',
            publisher: 'TechCrunch',
            datePublished: '2022-01-12',
          },
          {
            title: 'The New York Times Buys Wordle',
            url: 'https://time.com/6143832/new-york-times-buys-wordle/',
            publisher: 'TIME',
            datePublished: '2022-02-01',
          },
          {
            title: 'Word Game Statistics 2026',
            url: 'https://www.a2zwords.com/en/word-game-stats/',
            publisher: 'A2ZWords',
          },
        ]}
      />
      <MostPopularWordGamesPageClient />
      <EsScrabbleCrossLink locale={locale} anchorVariant="blog" />
    </>
  );
}
