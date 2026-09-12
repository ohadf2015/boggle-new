import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import DeathOfTurnBasedWordGamesPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'death-of-turn-based-word-games';
const DATE_PUBLISHED = '2026-09-12';
const DATE_MODIFIED = '2026-09-12';

const metaTitles: Record<string, string> = {
  en: 'Turn-Based Word Games Are Dying — What Replaced Them (2026)',
  he: 'למה מחקתי את משחקי המילים מבוססי התורות — ומה בא במקומם',
  sv: 'Ordspel i realtid vs turbaserat – varför jag raderade appen',
  ja: '11日待った一手は「QI」——ターンベース言葉ゲームの終わり',
  es: 'Adiós al modo por turnos: juegos de palabras con amigos',
};

const metaDescriptions: Record<string, string> = {
  en: 'Turn-based word games taught a generation that playing with friends means waiting. Why async play is fading and what real-time word games replaced it with.',
  he: 'חיכיתי 11 יום למילה אחת. משחקי מילים מבוססי תורות לימדו אותנו שמשחק עם חברים זה המתנה. למה זמן אמת מנצח, מתי אסינכרוני עדיין שווה, ואיך מארגנים ערב משחק כבר הערב.',
  sv: 'Turbaserade ordspel fick en hel generation att vänta på sina vänner. En krönika om elva dagar, ett trebokstavsord – och varför realtid vinner.',
  ja: '相手の一手に11日待たされた私は、アプリを消した。ターンベース言葉ゲームが続かない本当の理由と、リアルタイム対戦が「友達と遊ぶ」を取り戻す仕組みを、実体験から正直に語るコラム。',
  es: 'Esperé 11 días a que mi amiga jugara una palabra de dos letras. Por eso los juegos de palabras con amigos se mudan al tiempo real: gratis y sin registros.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function DeathOfTurnBasedWordGamesPage({ params }: PageProps) {
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
        keywords="turn based word games, words with friends alternative, real-time word games, async word games dying, play word games with friends online, multiplayer word game browser"
        articleSection="Opinion"
      />
      <DeathOfTurnBasedWordGamesPageClient />
    </>
  );
}
