import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import SpellingBeeSciencePageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'spelling-bee-science-vocabulary';
const DATE_PUBLISHED = '2026-06-27';
const DATE_MODIFIED = '2026-06-27';

const metaTitles: Record<string, string> = {
  en: 'Why Spelling Bees Work: The Memory Science Behind Elite Vocabulary',
  he: 'למה חידוני איות עובדים: מדע הזיכרון מאחורי אוצר מילים ברמה עילית',
  sv: 'Varför stavningstävlingar fungerar: Minnesforskning om ordförråd på elitnivå',
  ja: 'スペリングビーはなぜ効果的か：エリート語彙力の背後にある記憶科学',
  es: 'Por Qué Funcionan los Concursos de Ortografía: La Ciencia del Vocabulario de Élite',
};

const metaDescriptions: Record<string, string> = {
  en: 'What spelling bee champions know that classrooms don\'t: orthographic mapping, retrieval practice, and the pressure paradox. Science-backed vocabulary strategies for students and teachers.',
  he: 'מה שמנצחי חידוני האיות יודעים שהכיתות לא: מיפוי אורתוגרפי, תרגול אחזור ופרדוקס הלחץ. אסטרטגיות אוצר מילים מבוססות מחקר.',
  sv: 'Vad stavningsmästare vet som klassrum inte vet: ortografisk kartläggning, återhämtningsträning och tryckets paradox. Forskningsbaserade vokabylärstrategier.',
  ja: 'スペリングビーチャンピオンが知っていること：正書法マッピング、検索練習、そしてプレッシャーの逆説。科学的根拠のある語彙戦略。',
  es: 'Lo que los campeones de ortografía saben y las aulas no: mapeo ortográfico, práctica de recuperación y la paradoja de la presión. Estrategias de vocabulario basadas en ciencia.',
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

export default async function SpellingBeeSciencePage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

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
        citations={[
          {
            title: 'Orthographic mapping in the acquisition of sight word reading, spelling memory, and vocabulary learning — Ehri (2014)',
            url: 'https://www.researchgate.net/publication/265850163',
            publisher: 'Scientific Studies of Reading',
          },
          {
            title: 'The Power of Testing Memory: Basic Research and Implications for Educational Practice — Roediger & Karpicke (2006)',
            url: 'https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x',
            publisher: 'Psychological Science in the Public Interest',
          },
          {
            title: '2024 Scripps National Spelling Bee — Bruhat Soma wins championship',
            url: 'https://spellingbee.com/2024-results',
            publisher: 'Scripps National Spelling Bee',
          },
          {
            title: 'The Yerkes-Dodson Law: Performance and Arousal — classic review',
            url: 'https://www.sciencedirect.com/science/article/pii/S0149763413001012',
            publisher: 'Neuroscience & Biobehavioral Reviews',
          },
          {
            title: 'r/languagelearning — community discussion on retrieval practice and vocabulary',
            url: 'https://www.reddit.com/r/languagelearning/',
            publisher: 'Reddit',
          },
        ]}
      />
      <SpellingBeeSciencePageClient />
    </>
  );
}
