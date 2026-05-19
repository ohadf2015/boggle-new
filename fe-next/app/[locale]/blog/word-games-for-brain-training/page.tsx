import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BrainTrainingPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'word-games-for-brain-training';
const DATE_PUBLISHED = '2025-12-20';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Benefits of Playing Word Making Games for Brain Training (Research)',
  he: 'יתרונות של משחקי מילים לאימון המוח - מה המחקר אומר',
  sv: 'Fördelar med Ordspel för Hjärnträning - Vad Forskningen Säger',
  ja: 'ワードゲームで脳トレ - プレイするメリットを研究が証明',
  es: 'Beneficios de Jugar Juegos de Palabras para el Cerebro (Investigación)',
};

const metaDescriptions: Record<string, string> = {
  en: 'What are the benefits of playing word making games? A 19,000-person study shows word games beat brain training apps for cognitive health. Evidence-based analysis of why free word games like Boggle and Wordle are better than Lumosity for brain training.',
  he: 'מה היתרונות של משחקי מילים לאימון המוח? מחקר על 19,000 משתתפים מראה שמשחקי מילים מנצחים אפליקציות אימון מוח. ניתוח מבוסס ראיות.',
  sv: 'Vilka är fördelarna med att spela ordspel? En studie med 19 000 deltagare visar att ordspel slår hjärnträningsappar. Evidensbaserad analys.',
  ja: 'ワードゲームのプレイにどんなメリットがあるか？19,000人の研究がワードゲームは脳トレアプリよりも認知機能に効果的と証明。',
  es: '¿Cuáles son los beneficios de jugar juegos de palabras? Un estudio con 19.000 participantes muestra que superan a las apps de entrenamiento cerebral.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function BrainTrainingPage({ params }: PageProps) {
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
      <BrainTrainingPageClient />
    </>
  );
}
