import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import MilatHayomHabitPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'milat-hayom-habit';
const DATE_PUBLISHED = '2026-05-11';
const DATE_MODIFIED = '2026-05-11';

const metaTitles: Record<string, string> = {
  he: 'מילת היום: איך משחק קטן של שלוש דקות הופך להרגל של שנה שלמה',
};

const metaDescriptions: Record<string, string> = {
  he: 'מה קורה במוח כשמשחקים מילה אחת ביום, ולמה הצורה הזו של משחק - מילת היום - דווקא בעברית עבדה רק החל מ-2024. מדריך מלא להרגל היומי.',
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

export default async function MilatHayomHabitPage({ params }: PageProps) {
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
        keywords="מילת היום, מילים בעברית, משחק מילים יומי, חידה יומית, משחק מילים עברי, וורדל בעברית, אוצר מילים, הרגל יומי, משחקי מילים, לימוד עברית"
        articleSection="Habits"
      />
      <MilatHayomHabitPageClient />
    </>
  );
}
