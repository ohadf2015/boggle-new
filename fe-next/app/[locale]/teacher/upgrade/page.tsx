import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'teacherUpgrade', path: '/teacher/upgrade', locale });
}

import UpgradePricingPageClient from './PageClient';

export default function UpgradePricingPage() {
  return <UpgradePricingPageClient />;
}
