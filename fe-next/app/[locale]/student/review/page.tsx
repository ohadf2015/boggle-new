import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import MissedWordsReviewPageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'education', path: '/student/review', locale, noIndex: true });
}

export const dynamic = 'force-dynamic';

export default function MissedWordsReviewPage() {
  return <MissedWordsReviewPageClient />;
}
