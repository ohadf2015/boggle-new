import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import JoinSheetPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'education', path: '/teacher/join-sheet', locale, noIndex: true });
}

export default function JoinSheetPage() {
  return <JoinSheetPageClient />;
}
