import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'privacy', path: '/legal/privacy', locale });
}

import PrivacyPolicyPageClient from './PageClient';

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = (contentByLocale[locale] ?? contentByLocale.en).title;
  const breadcrumbItems = [
    { name: 'LexiClash', url: `https://www.lexiclash.live/${locale}` },
    { name: title, url: `https://www.lexiclash.live/${locale}/legal/privacy` },
  ];
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <PrivacyPolicyPageClient />
    </>
  );
}
