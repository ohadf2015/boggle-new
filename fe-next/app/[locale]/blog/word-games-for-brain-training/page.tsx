import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BrainTrainingPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'word-games-for-brain-training';
const DATE_PUBLISHED = '2026-03-09';

const metaTitles: Record<string, string> = {
  en: 'Word Games for Brain Training - What the Research Actually Says',
  he: 'משחקי מילים לאימון המוח - מה המחקר באמת אומר',
  sv: 'Ordspel för Hjärnträning - Vad Forskningen Faktiskt Säger',
  ja: '脳トレとしてのワードゲーム - 研究が本当に示していること',
  es: 'Juegos de Palabras para Entrenar el Cerebro - Lo Que Dice la Investigación',
};

const metaDescriptions: Record<string, string> = {
  en: 'What 19,000-person studies actually say about word games and brain health. Evidence-based analysis of cognitive reserve, the Lumosity settlement, and practical recommendations.',
  he: 'מה מחקרים על 19,000 משתתפים באמת אומרים על משחקי מילים ובריאות המוח. ניתוח מבוסס ראיות של רזרבה קוגניטיבית והמלצות מעשיות.',
  sv: 'Vad studier med 19 000 deltagare faktiskt säger om ordspel och hjärnhälsa. Evidensbaserad analys av kognitiv reserv och praktiska rekommendationer.',
  ja: '19,000人規模の研究がワードゲームと脳の健康について本当に言っていること。認知予備能のエビデンスに基づく分析と実践的な推奨。',
  es: 'Lo que estudios con 19.000 participantes realmente dicen sobre juegos de palabras y salud cerebral. Análisis basado en evidencia y recomendaciones prácticas.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED });
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
      />
      <BrainTrainingPageClient />
    </>
  );
}
