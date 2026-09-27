import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import FreeWordGamesOnlinePageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'free-word-games-online';
const DATE_PUBLISHED = '2026-05-11';
const DATE_MODIFIED = '2026-05-11';

const metaTitles: Record<string, string> = {
  en: 'Free Word Games Online: The Honest Guide (No Pay-to-Win, 2026)',
  ru: 'Бесплатные словесные игры онлайн: честный гайд 2026',
};

const metaDescriptions: Record<string, string> = {
  en: 'A field guide to free word games that respect your time and wallet. Five-question red-flag checklist + the daily puzzle and PWA patterns that actually work in 2026.',
  ru: 'Путеводитель по бесплатным словесным играм без платежей. Чеклист красных флагов и проверенные форматы ежедневных головоломок и веб-приложений для 2026.',
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
    ruTranslated: 'ru' in metaTitles,
  });
}

export default async function FreeWordGamesOnlinePage({ params }: PageProps) {
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
        keywords="free word games online, free word games no download, free word puzzle games, browser word games, free daily word game, free multiplayer word games, word games without ads"
        articleSection="Guide"
      />
      <FreeWordGamesOnlinePageClient />
    </>
  );
}
