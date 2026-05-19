import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import WhyAddictivePageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'why-word-games-are-addictive';
const DATE_PUBLISHED = '2025-11-12';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: "Why You Can't Stop Playing Word Games - The Psychology Explained",
  he: 'למה אי אפשר להפסיק לשחק משחקי מילים - הפסיכולוגיה מאחורי ההתמכרות',
  sv: 'Varfor Du Inte Kan Sluta Spela Ordspel - Psykologin Forklarad',
  ja: 'ワードゲームがやめられない理由 - 心理学で解説',
  es: 'Por Que No Puedes Dejar de Jugar Juegos de Palabras - La Psicologia Explicada',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover why word games are so addictive. Learn about dopamine, flow states, the Zeigarnik effect, and the neuroscience behind why your brain craves "just one more round."',
  he: 'גלו למה משחקי מילים כל כך ממכרים. למדו על דופמין, מצבי זרימה, אפקט זייגרניק, ומדע המוח מאחורי הדחף ל"עוד סיבוב אחד."',
  sv: 'Upptack varfor ordspel ar sa beroendeframkallande. Lar dig om dopamin, flowtillstand, Zeigarnikeffekten och neurovetenskapen bakom "bara en runda till."',
  ja: 'ワードゲームがなぜこんなに中毒性があるのか発見しよう。ドーパミン、フロー状態、ツァイガルニク効果、「あと1ラウンドだけ」の神経科学を解説。',
  es: 'Descubre por que los juegos de palabras son tan adictivos. Aprende sobre dopamina, estados de flujo, el efecto Zeigarnik y la neurociencia detras de "solo una ronda mas."',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
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
