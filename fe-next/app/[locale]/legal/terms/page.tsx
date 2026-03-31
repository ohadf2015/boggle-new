import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'terms', path: '/legal/terms', locale });
}

import TermsOfServicePageClient from './PageClient';

export default function TermsOfServicePage() {
  return <TermsOfServicePageClient />;
}
