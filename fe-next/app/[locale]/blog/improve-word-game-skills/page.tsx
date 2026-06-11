import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import ImproveSkillsPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'improve-word-game-skills';
const DATE_PUBLISHED = '2025-09-15';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'How to Find Words in Word Hunt & Boggle - Best Tips & Strategies',
  he: 'איך למצוא מילים מהר יותר - טיפים לבוגל ומשחקי מילים',
  sv: 'Hur Man Hittar Ord Snabbare - Bästa Tips för Ordspel',
  ja: 'ワードハントで単語を見つけるコツ - ボグル攻略法',
  es: 'Cómo Encontrar Palabras Más Rápido - Tips para Boggle y Word Hunt',
};

const metaDescriptions: Record<string, string> = {
  en: 'What is the best way to find words in word hunt? Proven strategies to improve your word game skills. Learn the chunking technique, pattern recognition, and vocabulary building tips used by competitive Boggle players. Free tips from experienced players.',
  he: 'מה הדרך הכי טובה למצוא מילים? אסטרטגיות מוכחות לשיפור מיומנויות במשחקי מילים. למדו טכניקת chunking, זיהוי תבניות וטיפים משחקנים מנוסים.',
  sv: 'Vad är det bästa sättet att hitta ord? Beprövade strategier för att förbättra dina ordspelsfärdigheter. Lär dig chunking-tekniken och mönsterigenkänning.',
  ja: 'ワードハントで単語を見つける最善の方法は？ワードゲームスキルを向上させる実証済み戦略。チャンキング技法やパターン認識を学ぶ。',
  es: '¿Cuál es la mejor manera de encontrar palabras? Estrategias probadas para mejorar tus habilidades en juegos de palabras. Técnica de chunking y reconocimiento de patrones.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function ImproveSkillsPage({ params }: PageProps) {
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
            title: 'Systematic review of fMRI studies on word processing',
            url: 'https://www.aimspress.com/article/id/2114',
            publisher: 'AIMS Neuroscience (2021)',
          },
          {
            title: 'The expertise theory of deliberate practice',
            url: 'https://psycnet.apa.org/doi/10.1037/0033-2909.112.3.475',
            publisher: 'Psychological Bulletin (Ericsson, Krampe & Tesch-Römer, 1993)',
          },
        ]}
      />
      <ImproveSkillsPageClient />
    </>
  );
}
