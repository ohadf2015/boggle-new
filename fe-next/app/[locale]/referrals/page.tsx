import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import ReferralDashboardClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = await generatePageMetadata({ seoKey: 'referrals', path: '/referrals', locale });
  // Auth-gated personalized page — no SEO value, exclude from index.
  return {
    ...meta,
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  };
}

export default function ReferralDashboardPage() {
  return <ReferralDashboardClient />;
}
