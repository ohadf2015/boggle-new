import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { extractFaqFromSections } from '@/utils/seo/parseFaqProse';
import OrdspelFamiljerPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'ordspel-familjer';
const DATE_PUBLISHED = '2026-05-11';
const DATE_MODIFIED = '2026-05-11';

const metaTitles: Record<string, string> = {
  sv: 'Ordspel för Familjer: Hur Vi Hittade Något Att Göra Tillsammans Som Faktiskt Funkar',
};

const metaDescriptions: Record<string, string> = {
  sv: 'En ärlig redogörelse om hur ordspel blev söndagens familjetradition: från sexåring till mormor på FaceTime. Vad fungerar, vad du bör undvika, och varför Å Ä Ö är viktigt.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.sv;
  const description = metaDescriptions[locale] || metaDescriptions.sv;

  return generateBlogMetadata({
    slug: SLUG,
    locale,
    title,
    description,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    hasTranslation: locale === 'sv',
  });
}

export default async function OrdspelFamiljerPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.sv;

  const siteUrl = 'https://www.lexiclash.live';
  const faqItems = extractFaqFromSections(content.sections);
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Hem', url: `${siteUrl}/${locale}` },
        { name: 'Blogg', url: `${siteUrl}/${locale}/blog` },
        { name: content.title, url: `${siteUrl}/${locale}/blog/${SLUG}` },
      ]} />
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.sv}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
        dateModified={DATE_MODIFIED}
        faqItems={faqItems}
        keywords="ordspel, ordspel för familjer, ordspel på svenska, dagligt ordspel, familjespel, ordpussel, svenska ordspel, ordspel för barn, ordspel utan internet, mysiga ordspel"
        articleSection="Familj"
      />
      <OrdspelFamiljerPageClient />
    </>
  );
}
