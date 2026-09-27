import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import { SvScrabbleCrossLink } from '@/components/seo/SvScrabbleCrossLink';
import { HeScrabbleCrossLink } from '@/components/seo/HeScrabbleCrossLink';
import BoggleVsScrabblePageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'boggle-vs-scrabble';
const DATE_PUBLISHED = '2026-03-28';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Boggle vs Scrabble: Honest Verdict After Years of Both (2026)',
  he: 'בוגל מול סקראבל: איזה משחק מילים באמת יותר טוב? (השוואה 2026)',
  sv: 'Boggle vs Scrabble: Vilket Ordspel Ar Egentligen Battre? (2026 Jamforelse)',
  ja: 'ボグル vs スクラブル：どちらの言葉ゲームが本当に優れている？（2026年比較）',
  es: 'Boggle vs Scrabble: Cual Juego de Palabras Es Realmente Mejor? (Comparacion 2026)',
};

const metaDescriptions: Record<string, string> = {
  en: 'Boggle vs Scrabble — honest verdict after years of both. 7 real differences in gameplay, strategy, brain benefits, social play. Pick yours in 2 minutes.',
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
  const faqItems = extractFaqFromSections(content.sections);
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
        faqItems={faqItems}
        keywords="boggle vs scrabble, boggle vs scrabble 2026, boggle versus scrabble, boggle scrabble difference, which is better boggle or scrabble, boggle scrabble comparison, word game comparison"
        articleSection="Comparison"
      />
      <BoggleVsScrabblePageClient />
      {locale === 'en' && (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <aside className="my-8 rounded-neo border-3 border-neo-lime/60 bg-neo-navy-light p-5 shadow-hard">
            <Link href="/en/scrabble-alternative-online" className="block group">
              <h3 className="font-neo-display text-lg font-black text-neo-lime underline decoration-2 underline-offset-4 group-hover:text-neo-white transition-colors">
                Looking for a free real-time Scrabble alternative online?
              </h3>
              <p className="mt-2 text-sm text-slate-300">LexiClash is the browser-based, real-time Scrabble alternative: 2-20 players, no download, no signup. See the full comparison →</p>
            </Link>
          </aside>
        </div>
      )}
      <EsScrabbleCrossLink locale={locale} anchorVariant="blog" />
      <SvScrabbleCrossLink locale={locale} anchorVariant="anagram" />
      <HeScrabbleCrossLink locale={locale} anchorVariant="anagram" />
    </>
  );
}
