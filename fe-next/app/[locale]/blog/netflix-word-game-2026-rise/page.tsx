import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import NetflixWordGameRisePageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'netflix-word-game-2026-rise';
const DATE_PUBLISHED = '2026-04-29';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Netflix Just Dropped a Word Game — 2026 Is the Year Word Games Took Over',
  he: 'נטפליקס שחררה משחק מילים — 2026 היא השנה של משחקי המילים',
  sv: 'Netflix släppte ett ordspel — 2026 är ordspelens år',
  ja: 'Netflixがワードゲームを投入 — 2026年はワードゲームの年',
  es: 'Juego de Palabras Netflix 2026 — Qué Es y Dónde Jugar Gratis',
};

const metaDescriptions: Record<string, string> = {
  en: 'Netflix added a daily word game and it is not a coincidence. Why every streaming service, brain-training app and TikTok feed is suddenly powered by 4x4 letter grids in 2026.',
  he: 'נטפליקס הוסיפה משחק מילים יומי וזה לא צירוף מקרים. למה כל שירות סטרימינג, אפליקציית אימון מוחי ופיד טיק־טוק פתאום בנויים סביב לוחות אותיות ב־2026.',
  sv: 'Netflix lade till ett dagligt ordspel och det är ingen tillfällighet. Varför varje streamingtjänst, hjärnträningsapp och TikTok-flöde plötsligt drivs av bokstavsrutnät 2026.',
  ja: 'Netflixがデイリーワードゲームを追加。偶然じゃない。なぜ全ストリーミング、脳トレアプリ、TikTokフィードが2026年に文字グリッドで動いているのか。',
  es: 'Descubre el juego de palabras Netflix 2026: qué es, cómo funciona y dónde jugar gratis sin descargas. Análisis del boom de word games en streaming.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({
    slug: SLUG,
    locale,
    title,
    description,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    hasTranslation: locale in metaTitles,
  });
}

export default async function NetflixWordGameRisePage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  const wordCount = content.sections.reduce(
    (sum, s) => sum + (s.title?.split(/\s+/).length ?? 0) + s.content.split(/\s+/).length,
    0,
  );

  const siteUrl = 'https://www.lexiclash.live';

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${siteUrl}/${locale}` },
          { name: 'Blog', url: `${siteUrl}/${locale}/blog` },
          { name: content.title, url: `${siteUrl}/${locale}/blog/${SLUG}` },
        ]}
      />
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.en}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
        dateModified={DATE_MODIFIED}
        wordCount={wordCount}
        keywords="netflix word game, juego de palabras netflix, netflix wordle, daily word game 2026, streaming word game, netflix games word puzzle, word game trends 2026"
        articleSection="Trends"
      />
      <NetflixWordGameRisePageClient />
      <EsScrabbleCrossLink locale={locale} anchorVariant="blog" />
    </>
  );
}
