import type { Metadata } from 'next';
import PracticeHubClient from './PageClient';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { PracticeHubJsonLd } from '@/components/seo/PracticeJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

// Client tree (LanguageContext + transitive useSearchParams) requires per-request
// render; SEO content (metadata + JSON-LD) ships in-band on every SSR pass.
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://www.lexiclash.live';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'practice', path: '/practice', locale });
}

export default async function PracticeHubPage({ params }: Props) {
  const { locale } = await params;
  return (
    <>
      <PracticeHubJsonLd locale={locale} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${SITE_URL}/${locale}` },
          { name: 'Practice', url: `${SITE_URL}/${locale}/practice` },
        ]}
      />
      <PracticeHubClient locale={locale} />
    </>
  );
}
