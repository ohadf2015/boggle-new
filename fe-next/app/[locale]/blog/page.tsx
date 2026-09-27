import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import BlogIndexPageClient from './PageClient';

export const revalidate = 86400;

const SITE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'blog', path: '/blog', locale });
}

const SAFE_LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es']);

export default async function BlogIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = SAFE_LOCALES.has(rawLocale) ? rawLocale : 'en';
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/${locale}/blog` },
    ],
  };
  // Safe: all content sourced from static constants, not user input
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <BlogIndexPageClient />
    </>
  );
}
