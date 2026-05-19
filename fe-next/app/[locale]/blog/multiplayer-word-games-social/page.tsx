import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import MultiplayerSocialPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'multiplayer-word-games-social';
const DATE_PUBLISHED = '2026-02-15';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Online Multiplayer Word Games Free - Why Playing With Friends Is Better',
  he: 'משחקי מילים מרובה משתתפים אונליין חינם - למה עם חברים זה טוב יותר',
  sv: 'Multiplayer Ordspel Online Gratis - Varfor Spela Med Vanner Ar Battre',
  ja: 'オンラインマルチプレイヤーワードゲーム無料 - 友達と遊ぶと別次元',
  es: 'Juegos de Palabras Multijugador Online Gratis - Jugar Con Amigos Es Mejor',
};

const metaDescriptions: Record<string, string> = {
  en: 'Looking for online multiplayer word games free to play with friends? Discover why multiplayer word games like Boggle and Words With Friends boost your brain more than solo play. No download needed — play web-based multiplayer word games instantly.',
  he: 'מחפשים משחקי מילים מרובה משתתפים אונליין חינם? גלו למה משחקי מילים עם חברים מגבירים את המוח יותר ממשחק יחיד. ללא הורדה.',
  sv: 'Letar du efter multiplayer ordspel online gratis? Upptack varfor ordspel med vanner starker hjarnan mer an solospel. Ingen nedladdning kravs.',
  ja: 'オンラインマルチプレイヤーワードゲームを無料で探していますか？友達とのワードゲームがソロプレイよりも脳を活性化する理由を発見。ダウンロード不要。',
  es: '¿Buscas juegos de palabras multijugador online gratis? Descubre por que jugar con amigos potencia tu cerebro mas que jugar solo. Sin descargas.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function MultiplayerSocialPage({ params }: PageProps) {
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
      <MultiplayerSocialPageClient />
    </>
  );
}
