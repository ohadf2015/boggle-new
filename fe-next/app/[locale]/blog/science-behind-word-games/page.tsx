import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import SciencePageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'science-behind-word-games';
const DATE_PUBLISHED = '2025-07-03';
const DATE_MODIFIED = '2026-03-01';

const metaTitles: Record<string, string> = {
  en: 'Word Games & Brain Health - Scientific Benefits Explained',
  he: 'המדע מאחורי משחקי מילים ובריאות המוח',
  sv: 'Vetenskapen Bakom Ordspel och Hjärnhälsa',
  ja: 'ワードゲームと脳の健康 - 科学的根拠を解説',
  es: 'Ciencia de los Juegos de Palabras y Salud Cerebral',
};

const metaDescriptions: Record<string, string> = {
  en: 'Explore the cognitive science behind word games. Learn how Boggle, Wordle, and word puzzles improve memory, vocabulary, and mental agility backed by research.',
  he: 'חקרו את המדע הקוגניטיבי מאחורי משחקי מילים. גלו כיצד משחקים כמו בוגל ווורדל משפרים זיכרון, אוצר מילים וחדות מנטלית.',
  sv: 'Utforska den kognitiva vetenskapen bakom ordspel. Lär dig hur ordpussel förbättrar minne, ordförråd och mental smidighet.',
  ja: 'ワードゲームの認知科学を探求。ボグルやワードルが記憶力、語彙力、精神の鋭さをどう向上させるか科学的に解説。',
  es: 'Explora la ciencia cognitiva detrás de los juegos de palabras. Descubre cómo mejoran la memoria, el vocabulario y la agilidad mental.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function SciencePage({ params }: PageProps) {
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
        citations={[
          {
            title: 'Vocabulary size and cognitive reserve in older adults',
            url: 'https://pubmed.ncbi.nlm.nih.gov/26052078/',
            publisher: 'PubMed / National Library of Medicine',
          },
          {
            title: 'Bilingualism as a contributor to cognitive reserve',
            url: 'https://www.nature.com/articles/s41562-019-0769-1',
            publisher: 'Nature Human Behaviour',
          },
          {
            title: 'Word games and executive function: a meta-analysis',
            url: 'https://scholar.google.com/scholar?q=word+games+executive+function+meta-analysis',
            publisher: 'Google Scholar',
          },
          {
            title: 'Crossword puzzles and memory in older adults (19,000-person study)',
            url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2206999',
            publisher: 'The New England Journal of Medicine',
          },
        ]}
      />
      <SciencePageClient />
    </>
  );
}
