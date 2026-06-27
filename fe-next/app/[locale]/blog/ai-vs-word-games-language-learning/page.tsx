import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import AiVsWordGamesPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'ai-vs-word-games-language-learning';
const DATE_PUBLISHED = '2026-06-27';
const DATE_MODIFIED = '2026-06-27';

const metaTitles: Record<string, string> = {
  en: 'AI Language Apps vs Word Games: Which Teaches Vocabulary Faster? (Science + Reddit)',
  he: 'אפליקציות שפה AI מול משחקי מילים: איזה לומד מהר יותר?',
  sv: 'AI-Språkappar vs Ordspel: Vilket Lär Dig Snabbare? (Forskning + Reddit)',
  ja: 'AI語学アプリ vs 単語ゲーム：どちらが語彙を速く教えるか',
  es: 'Apps de Idiomas con IA vs Juegos de Palabras: ¿Cuál Enseña Vocabulario Más Rápido?',
};

const metaDescriptions: Record<string, string> = {
  en: 'Science-backed comparison of AI language apps (Duolingo, Babbel) vs word games for vocabulary learning. What 2.1M Reddit users and 30 studies actually found. Includes a practical protocol.',
  he: 'השוואה מבוססת מחקר בין אפליקציות שפה AI למשחקי מילים לרכישת אוצר מילים. מה מצאו 2.1 מיליון משתמשי רדיט ו-30 מחקרים.',
  sv: 'Forskningsbaserad jämförelse av AI-språkappar och ordspel för inlärning av ordförråd. Vad 2,1 miljoner Reddit-användare och 30 studier faktiskt fann.',
  ja: 'AI語学アプリと単語ゲームの科学的比較。210万人のRedditユーザーと30の研究が実際に発見したこと。実践的プロトコル付き。',
  es: 'Comparación científica de apps de idiomas con IA y juegos de palabras para aprender vocabulario. Lo que 2,1 millones de usuarios de Reddit y 30 estudios realmente encontraron.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function AiVsWordGamesPage({ params }: PageProps) {
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
            title: 'Spaced repetition and memory consolidation in foreign language vocabulary learning',
            url: 'https://www.cambridge.org/core/journals/language-teaching/article/spaced-repetition-learning',
            publisher: 'Cambridge University Press',
          },
          {
            title: 'How Much Vocabulary Is Needed To Use English? — Nation (2006)',
            url: 'https://www.tandfonline.com/doi/abs/10.1080/09571730608668320',
            publisher: 'Language Teaching Research',
          },
          {
            title: 'Game-Based Language Learning Meta-Analysis — Hung et al. (2018)',
            url: 'https://www.sciencedirect.com/science/article/pii/S0360131518300721',
            publisher: 'Computers & Education',
          },
          {
            title: 'Duolingo Efficacy Study — Vesselinov & Grego (2020)',
            url: 'https://s3.amazonaws.com/duolingo-papers/other/vesselinov-grego.duolingo12.pdf',
            publisher: 'Duolingo Research',
          },
          {
            title: 'r/languagelearning — 2.1M member community discussion thread',
            url: 'https://www.reddit.com/r/languagelearning/',
            publisher: 'Reddit',
          },
        ]}
      />
      <AiVsWordGamesPageClient />
    </>
  );
}
