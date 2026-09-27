import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Auth dashboard — keep noindex. Public teacher GEO lives on
  // /education/games-for-teachers (FAQPage + Course JSON-LD + visible H2/H3 answers).
  return generatePageMetadata({ seoKey: 'education', path: '/teacher', locale, noIndex: true });
}

import TeacherPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default function TeacherPage() {
  return <TeacherPageClient />;
}
