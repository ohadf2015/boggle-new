import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BoggleAlternativesPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'best-boggle-alternatives-2026';
const DATE_PUBLISHED = '2025-12-01';
const DATE_MODIFIED = '2026-03-15';

const metaTitles: Record<string, string> = {
  en: 'Best Boggle Alternatives 2026 - Free Online Games Like Boggle (No Download)',
  he: 'חלופות הבוגל הטובות ביותר 2026 - משחקים כמו בוגל אונליין חינם',
  sv: 'Bästa Boggle-Alternativen 2026 - Gratis Onlinespel Som Boggle',
  ja: '2026年ベストBoggle代替ゲーム - 無料オンラインワードゲーム比較',
  es: 'Mejores Alternativas a Boggle 2026 - Juegos Gratis Online Sin Descargar',
};

const metaDescriptions: Record<string, string> = {
  en: 'Looking for games like Boggle online free? Honest reviews of every Boggle alternative in 2026: Wordle, Words With Friends, Wordscapes, LexiClash — compared with real pros and cons. Play free, no download needed.',
  he: 'מחפשים משחקים כמו בוגל אונליין חינם? ביקורות כנות על כל חלופת בוגל ב-2026 — וורדל, מילים עם חברים, LexiClash ועוד. ללא הורדה.',
  sv: 'Letar du efter spel som Boggle online gratis? Ärliga recensioner av alla Boggle-alternativ 2026. Wordle, Words With Friends, LexiClash och fler — utan nedladdning.',
  ja: 'Boggleのような無料オンラインゲームを探していますか？2026年のBoggle代替ゲームを本音レビュー。Wordle、Words With Friends、LexiClashなど — ダウンロード不要。',
  es: '¿Buscas juegos como Boggle online gratis? Reseñas honestas de todas las alternativas a Boggle en 2026. Wordle, Words With Friends, LexiClash y más — sin descargar.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED });
}

export default async function BoggleAlternativesPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  const siteUrl = 'https://www.lexiclash.live';
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: `${siteUrl}/${locale}` },
        { name: 'Blog', url: `${siteUrl}/${locale}/blog` },
        { name: content.title, url: `${siteUrl}/${locale}/blog/${SLUG}` },
      ]} />
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.en}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
        dateModified={DATE_MODIFIED}
      />
      <BoggleAlternativesPageClient />
    </>
  );
}
