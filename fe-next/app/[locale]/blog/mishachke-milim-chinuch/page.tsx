import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import MishachkeMilimChinuchPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'mishachke-milim-chinuch';
const DATE_PUBLISHED = '2026-05-11';
const DATE_MODIFIED = '2026-05-11';

const metaTitles: Record<string, string> = {
  he: 'משחקי מילים בכיתה: מה קורה כשמורה לעברית מחליפה דף עבודה במשחק',
};

const metaDescriptions: Record<string, string> = {
  he: 'שלושה מודלים של משחקי מילים בכיתת עברית - דואלים, תחרות כיתה, וגשר בין הבית לבית הספר. מה שמורות בישראל ניסו ומה שעבד.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.he;
  const description = metaDescriptions[locale] || metaDescriptions.he;

  return generateBlogMetadata({
    slug: SLUG,
    locale,
    title,
    description,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    hasTranslation: locale === 'he',
  });
}

export default async function MishachkeMilimChinuchPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.he;

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
        description={metaDescriptions[locale] || metaDescriptions.he}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
        dateModified={DATE_MODIFIED}
        faqItems={faqItems}
        keywords="משחקי מילים, משחקי מילים לכיתה, חינוך לעברית, מורות לעברית, משחקים בכיתה, לימוד עברית, הוראת עברית, שיעורי עברית, משחקי מילים לילדים, חינוך בישראל"
        articleSection="Education"
      />
      <MishachkeMilimChinuchPageClient />
    </>
  );
}
