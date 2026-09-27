import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import BoggleVsWordlePageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'boggle-vs-wordle';
const DATE_PUBLISHED = '2026-03-28';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Boggle vs Wordle in 2026: I Played Both Daily — Here\'s My Verdict',
  he: 'באגל מול וורדל 2026 - השוואה כנה: איזה משחק מילים יותר טוב?',
  sv: 'Boggle vs Wordle 2026 - Ärlig Jämförelse: Vilket Ordspel Är Bäst?',
  ja: 'Boggle vs Wordle 2026 - 正直比較：どちらのワードゲームが優れている？',
  es: 'Boggle vs Wordle 2026 - Comparación Honesta: ¿Qué Juego de Palabras Es Mejor?',
};

const metaDescriptions: Record<string, string> = {
  en: 'Boggle vs Wordle in 2026 — I played both daily. Gameplay, difficulty, addictiveness, daily-ritual value compared. Which deserves your 5 minutes? Verdict inside.',
  he: 'באגל מול וורדל — איזה משחק מילים יותר טוב? השוואה כנה של גיימפליי, קושי, ממכרות וערך. גלו מי באמת שווה את הזמן שלכם ב-2026.',
  sv: 'Boggle vs Wordle — vilket ordspel är bäst? En ärlig jämförelse av gameplay, svårighetsgrad, beroendeframkallande och värde. Ta reda på vilket som förtjänar din dagliga tid 2026.',
  ja: 'Boggle vs Wordle — どちらのワードゲームが優れている？ゲームプレイ、難易度、中毒性、価値を正直に比較。2026年にどちらが毎日の時間に値するか。',
  es: 'Boggle vs Wordle — ¿qué juego de palabras es mejor? Comparación honesta de gameplay, dificultad, adicción y valor. Descubre cuál merece tu tiempo diario en 2026.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function BoggleVsWordlePage({ params }: PageProps) {
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
        keywords="boggle vs wordle, wordle vs boggle, boggle wordle 2026, daily word puzzle comparison, wordle alternative, boggle alternative, word game daily ritual"
        articleSection="Comparison"
      />
      <BoggleVsWordlePageClient />
    </>
  );
}
