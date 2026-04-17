import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BoggleVsScrabblePageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'boggle-vs-scrabble';
const DATE_PUBLISHED = '2026-03-28';
const DATE_MODIFIED = '2026-03-28';

const metaTitles: Record<string, string> = {
  en: 'Boggle vs Scrabble: Which Word Game Is Actually Better? (2026 Comparison)',
  he: 'בוגל מול סקראבל: איזה משחק מילים באמת יותר טוב? (השוואה 2026)',
  sv: 'Boggle vs Scrabble: Vilket Ordspel Ar Egentligen Battre? (2026 Jamforelse)',
  ja: 'ボグル vs スクラブル：どちらの言葉ゲームが本当に優れている？（2026年比較）',
  es: 'Boggle vs Scrabble: Cual Juego de Palabras Es Realmente Mejor? (Comparacion 2026)',
};

const metaDescriptions: Record<string, string> = {
  en: 'Boggle vs Scrabble — an honest comparison of gameplay, strategy, digital versions, brain benefits, and social experience. Find out which classic word game is right for you in 2026.',
  he: 'בוגל מול סקראבל — השוואה כנה של משחקיות, אסטרטגיה, גרסאות דיגיטליות, יתרונות מוחיים וחוויה חברתית. גלו איזה משחק מילים קלאסי מתאים לכם ב-2026.',
  sv: 'Boggle vs Scrabble — en arlig jamforelse av spelmekanik, strategi, digitala versioner, hjarnfordelar och social upplevelse. Ta reda pa vilket klassiskt ordspel som passar dig 2026.',
  ja: 'ボグル vs スクラブル — ゲームプレイ、戦略、デジタル版、脳トレ効果、ソーシャル体験の正直な比較。2026年、あなたに合った言葉ゲームを見つけよう。',
  es: 'Boggle vs Scrabble — una comparacion honesta de jugabilidad, estrategia, versiones digitales, beneficios cerebrales y experiencia social. Descubre cual juego de palabras clasico es para ti en 2026.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function BoggleVsScrabblePage({ params }: PageProps) {
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
      <BoggleVsScrabblePageClient />
    </>
  );
}
