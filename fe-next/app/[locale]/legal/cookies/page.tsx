import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'cookies', path: '/legal/cookies', locale });
}

import CookiePolicyPageClient from './PageClient';

export default function CookiePolicyPage() {
  return <CookiePolicyPageClient />;
}
