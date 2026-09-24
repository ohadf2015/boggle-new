/**
 * Student Lessons Index Page — the full lesson list in the Academy frame.
 *
 * It used to redirect to `/student`, which made the Academy dock's "Lessons"
 * button a round trip back to the map. The list lives here now; a single
 * lesson is still `/student/lessons/[id]`.
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import StudentLessonsPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'education', path: '/student/lessons', locale, noIndex: true });
}

export default function StudentLessonsPage() {
  return <StudentLessonsPageClient />;
}
