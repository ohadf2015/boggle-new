import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BoggleAlternativesPageClient from './PageClient';
import { contentByLocale } from './content';
import { faqByLocale } from './faq';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'best-boggle-alternatives-2026';
const DATE_PUBLISHED = '2025-12-01';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Games Like Boggle — 6 Best Free Alternatives 2026 | LexiClash',
  he: 'ניסיתי כל חלופת בוגל ב-2026 — הנה מה שבאמת שווה לשחק',
  sv: 'Jag testade alla Boggle-alternativ 2026 — Här är vad som faktiskt är värt att spela',
  ja: 'Boggle代替ゲームを全部試した（2026年）— 本当に遊ぶ価値があるのはこれだ',
  es: 'Probé todas las alternativas a Boggle (2026) — Esto es lo que vale la pena jugar',
};

const metaDescriptions: Record<string, string> = {
  en: '6 games like Boggle tested in 2026 — Wordle, Words With Friends, LexiClash. Honest reviews: which are pay-to-win duds vs genuinely great? Free, no download.',
  he: 'ביקורות כנות (ומעט מטורפות) של 6 חלופות בוגל. מי זבל של pay-to-win ומי באמת שווה? וורדל, מילים עם חברים, LexiClash ועוד — חינם וללא הורדה.',
  sv: 'Ärliga (och lite galna) recensioner av 6 Boggle-alternativ. Vilka är pay-to-win-skräp? Vilka är genuint bra? Wordle, Words With Friends, LexiClash jämförda — gratis, ingen nedladdning.',
  ja: '6つのBoggle代替ゲームを本音レビュー。課金ゲーはどれ？本当に面白いのは？Wordle、Words With Friends、LexiClashを比較 — 無料・ダウンロード不要。',
  es: 'Reseñas honestas (y algo locas) de 6 alternativas a Boggle. ¿Cuáles son basura pay-to-win? ¿Cuáles valen la pena? Wordle, Words With Friends, LexiClash comparados — gratis, sin descargar.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function BoggleAlternativesPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;
  const faqs = faqByLocale[locale] || faqByLocale.en;

  const wordCount = content.sections.reduce(
    (sum, s) => sum + (s.title?.split(/\s+/).length ?? 0) + s.content.split(/\s+/).length,
    0,
  );

  // Safe: all content from static faq.ts constants, not user input
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

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
        wordCount={wordCount}
        keywords="boggle alternatives, best boggle alternatives 2026, games like boggle, free boggle alternatives, boggle replacement, online boggle alternatives, multiplayer word games"
        articleSection="Listicle"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <BoggleAlternativesPageClient />
    </>
  );
}
