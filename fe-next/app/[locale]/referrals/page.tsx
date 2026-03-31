import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import ReferralDashboardClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'referrals', path: '/referrals', locale });
}

export default function ReferralDashboardPage() {
  return <ReferralDashboardClient />;
}
