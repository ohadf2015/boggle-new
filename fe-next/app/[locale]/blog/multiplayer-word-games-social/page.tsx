import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import MultiplayerSocialPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'multiplayer-word-games-social';
const DATE_PUBLISHED = '2026-03-09';

const metaTitles: Record<string, string> = {
  en: 'Why Playing Word Games With Friends Hits Different - Social Gaming Science',
  he: 'למה משחקי מילים עם חברים זה סיפור אחר - מדע הגיימינג החברתי',
  sv: 'Varfor ordspel med vanner ar nagot annat - Vetenskapen om socialt spelande',
  ja: '友達とワードゲームが別次元になる理由 - ソーシャルゲーミングの科学',
  es: 'Por que jugar juegos de palabras con amigos es diferente - Ciencia del gaming social',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover the neuroscience of social word games. How multiplayer Boggle, competitive cognition, and party games boost your brain more than solo play.',
  he: 'גלו את מדעי המוח של משחקי מילים חברתיים. איך משחקים מרובי משתתפים מגבירים את המוח יותר ממשחק יחיד.',
  sv: 'Upptack neurovetenskapen bakom sociala ordspel. Hur multiplayer-ordspel och tavlingskognition starker hjarnan mer an solospel.',
  ja: 'ソーシャルワードゲームの神経科学を発見。マルチプレイヤーボグルと競争認知がソロプレイ以上に脳を活性化させる仕組み。',
  es: 'Descubre la neurociencia de los juegos de palabras sociales. Como los juegos multijugador potencian tu cerebro mas que jugar solo.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED });
}

export default async function MultiplayerSocialPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  return (
    <>
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.en}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
      />
      <MultiplayerSocialPageClient />
    </>
  );
}
