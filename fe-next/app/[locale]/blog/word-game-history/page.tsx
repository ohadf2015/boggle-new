import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import WordGameHistoryPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'word-game-history';
const DATE_PUBLISHED = '2026-01-08';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'History of Word Games - From Ancient Tiles to Digital Grids',
  he: 'ההיסטוריה של משחקי מילים - מאריחים עתיקים עד רשתות דיגיטליות',
  sv: 'Ordspelens Historia - Från Antika Brickor till Digitala Rutnät',
  ja: 'ワードゲームの歴史 - 古代のタイルからデジタルグリッドまで',
  es: 'Historia de los Juegos de Palabras - De Azulejos Antiguos a Cuadrículas Digitales',
  ru: 'История словесных игр - от древних плиток к цифровым сеткам',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover the wild 4,000-year history of word games. From ancient Egyptian riddles to Scrabble, Boggle, Wordle, and the future of multilingual real-time word games.',
  he: 'גלו את ההיסטוריה המטורפת בת 4,000 השנים של משחקי מילים. מחידות מצריות עתיקות דרך סקרבל, בוגל, וורדל ועתיד משחקי המילים.',
  sv: 'Upptäck ordspelens vilda 4 000-åriga historia. Från forntida egyptiska gåtor till Scrabble, Boggle, Wordle och framtidens flerspråkiga ordspel.',
  ja: 'ワードゲームの4000年にわたる驚くべき歴史を発見。古代エジプトの謎々からスクラブル、ボグル、Wordleまで。',
  es: 'Descubre la alocada historia de 4,000 años de los juegos de palabras. Desde acertijos egipcios hasta Scrabble, Boggle, Wordle y el futuro.',
  ru: 'Откройте дикую 4000-летнюю историю словесных игр. От древнеегипетских загадок к Скраблу, Богдлу, Wordle и будущему многоязычных словесных игр.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles, ruTranslated: 'ru' in metaTitles });
}

export default async function WordGameHistoryPage({ params }: PageProps) {
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
      <WordGameHistoryPageClient />
    </>
  );
}
