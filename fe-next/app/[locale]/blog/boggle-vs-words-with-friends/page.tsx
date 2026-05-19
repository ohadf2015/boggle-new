import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import BoggleVsWwfPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'boggle-vs-words-with-friends';
const DATE_PUBLISHED = '2026-03-28';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Boggle vs Words With Friends 2026 - Real-Time vs Async Word Game Comparison',
  he: 'בוגל מול מילים עם חברים 2026 - השוואת משחקי מילים בזמן אמת מול אסינכרוני',
  sv: 'Boggle vs Words With Friends 2026 - Realtid vs Asynkront Ordspel Jamforelse',
  ja: 'Boggle vs Words With Friends 2026年 - リアルタイム vs 非同期ワードゲーム徹底比較',
  es: 'Boggle vs Words With Friends 2026 - Comparativa de Juegos de Palabras en Tiempo Real vs Asincrono',
};

const metaDescriptions: Record<string, string> = {
  en: 'Boggle vs Words With Friends — which word game is better in 2026? Honest comparison of real-time grid word-finding vs async tile placement. Speed, strategy, multiplayer, monetization, and fun factor compared. Play free Boggle online.',
  he: 'בוגל מול מילים עם חברים — איזה משחק מילים טוב יותר ב-2026? השוואה כנה של מציאת מילים בזמן אמת מול הנחת אריחים. מהירות, אסטרטגיה, מולטיפלייר ומונטיזציה.',
  sv: 'Boggle vs Words With Friends — vilket ordspel ar bast 2026? Arlig jamforelse av realtidsordletning mot asynkron brickplacering. Hastighet, strategi, multiplayer och monetisering.',
  ja: 'Boggle vs Words With Friends — 2026年どちらが優れたワードゲーム？リアルタイムグリッド vs 非同期タイル配置の正直な比較。スピード、戦略、マルチプレイヤー、課金を徹底比較。',
  es: 'Boggle vs Words With Friends — cual es mejor en 2026? Comparacion honesta de busqueda de palabras en tiempo real vs colocacion de fichas. Velocidad, estrategia, multijugador y monetizacion.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function BoggleVsWwfPage({ params }: PageProps) {
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
        keywords="boggle vs words with friends, boggle vs wwf, words with friends alternative, boggle words with friends comparison, real-time word games"
        articleSection="Comparison"
      />
      <BoggleVsWwfPageClient />
    </>
  );
}
