import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import StudentQuickPlayPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'quickPlay', path: '/student/quick-play', locale, noIndex: true });
}

export default function StudentQuickPlayPage() {
  return <StudentQuickPlayPageClient />;
}
