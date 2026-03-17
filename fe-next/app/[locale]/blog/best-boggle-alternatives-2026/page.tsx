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
  en: 'Best Boggle Alternatives 2026 — I Tried Them All So You Don\'t Have To',
  he: 'חלופות הבוגל הטובות ביותר 2026 — ניסיתי את כולן בשבילכם',
  sv: 'Bästa Boggle-alternativen 2026 — Jag testade alla så du slipper',
  ja: '2026年ベストBoggle代替ゲーム — 全部試してみた',
};

const metaDescriptions: Record<string, string> = {
  en: 'Honest reviews of every Boggle alternative worth playing in 2026. Wordle, Words With Friends, Wordscapes, LexiClash and more — with real pros and cons.',
  he: 'ביקורות כנות על כל חלופת בוגל ששווה לשחק ב-2026. וורדל, מילים עם חברים, LexiClash ועוד — יתרונות וחסרונות אמיתיים.',
  sv: 'Ärliga recensioner av varje Boggle-alternativ värt att spela 2026. Wordle, Words With Friends, Wordscapes, LexiClash och fler.',
  ja: '2026年にプレイする価値のあるBoggle代替ゲームの正直なレビュー。Wordle、Words With Friends、LexiClashなど。',
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
