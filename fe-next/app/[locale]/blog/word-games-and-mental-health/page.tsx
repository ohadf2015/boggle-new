import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import MentalHealthPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'word-games-and-mental-health';
const DATE_PUBLISHED = '2025-10-05';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Benefits of Playing Word Games for Mental Health & Anxiety Relief',
  he: 'יתרונות של משחקי מילים לבריאות הנפש - הפחתת חרדה ולחץ',
  sv: 'Fördelar med Ordspel för Mental Hälsa & Ångestlindring',
  ja: 'ワードゲームのメンタルヘルスへの効果 - 不安解消とストレス軽減',
  es: 'Beneficios de Jugar Juegos de Palabras para la Salud Mental',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover how word games can help manage anxiety through flow states, cognitive displacement, and daily rituals. Personal story backed by psychology research.',
  he: 'גלו כיצד משחקי מילים יכולים לעזור בניהול חרדה דרך מצבי זרימה, עקירה קוגניטיבית וטקסים יומיים. סיפור אישי מגובה במחקר פסיכולוגי.',
  sv: 'Upptäck hur ordspel kan hjälpa hantera ångest genom flow-tillstånd, kognitiv undanträngning och dagliga ritualer. Personlig berättelse stödd av psykologisk forskning.',
  ja: 'フロー状態、認知的置換、日課の儀式を通じて、ワードゲームが不安管理にどう役立つかを発見。心理学研究に裏付けられた個人的な物語。',
  es: 'Descubre cómo los juegos de palabras pueden ayudar a manejar la ansiedad a través de estados de flujo, desplazamiento cognitivo y rituales diarios.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function MentalHealthPage({ params }: PageProps) {
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
      <MentalHealthPageClient />
    </>
  );
}
