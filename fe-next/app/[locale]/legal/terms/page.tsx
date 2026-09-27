import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'terms', path: '/legal/terms', locale });
}

import TermsOfServicePageClient from './PageClient';

export default async function TermsOfServicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = (contentByLocale[locale] ?? contentByLocale.en).title;
  const breadcrumbItems = [
    { name: 'LexiClash', url: `https://www.lexiclash.live/${locale}` },
    { name: title, url: `https://www.lexiclash.live/${locale}/legal/terms` },
  ];
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <TermsOfServicePageClient />
    </>
  );
}
