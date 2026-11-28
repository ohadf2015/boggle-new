import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { getBlogPostDates } from '@/lib/blog/posts';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import WhyAddictivePageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'why-word-games-are-addictive';
const { datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED } = getBlogPostDates(SLUG);

const metaTitles: Record<string, string> = {
  en: 'Why Word Games Are So Addictive: Dopamine, Flow and More',
  he: 'למה אי אפשר להפסיק לשחק משחקי מילים - הפסיכולוגיה מאחורי ההתמכרות',
  sv: 'Varfor Du Inte Kan Sluta Spela Ordspel - Psykologin Forklarad',
  ja: 'ワードゲームがやめられない理由 - 心理学で解説',
  es: 'Por Que No Puedes Dejar de Jugar Juegos de Palabras - La Psicologia Explicada',
  ru: 'Почему ты не можешь остановиться - психология словесных игр',
};

const metaDescriptions: Record<string, string> = {
  en: "Each word you find pays out a small dopamine hit, flow makes an hour feel like ten minutes, and an unfinished board keeps nagging at you. Here's why.",
  he: 'גלו למה משחקי מילים כל כך ממכרים. למדו על דופמין, מצבי זרימה, אפקט זייגרניק, ומדע המוח מאחורי הדחף ל"עוד סיבוב אחד."',
  sv: 'Upptack varfor ordspel ar sa beroendeframkallande. Lar dig om dopamin, flowtillstand, Zeigarnikeffekten och neurovetenskapen bakom "bara en runda till."',
  ja: 'ワードゲームがなぜこんなに中毒性があるのか発見しよう。ドーパミン、フロー状態、ツァイガルニク効果、「あと1ラウンドだけ」の神経科学を解説。',
  es: 'Descubre por que los juegos de palabras son tan adictivos. Aprende sobre dopamina, estados de flujo, el efecto Zeigarnik y la neurociencia detras de "solo una ronda mas."',
  ru: 'Откройте для себя науку за словесными играми — дофамин, состояние потока, эффект Зейгарник и нейробиологию того, почему твой мозг хочет «еще один раунд».',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles, ruTranslated: 'ru' in metaTitles });
}

export default async function WhyAddictivePage({ params }: PageProps) {
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
      <WhyAddictivePageClient />
    </>
  );
}
