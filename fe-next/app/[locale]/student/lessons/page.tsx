/**
 * Student Lessons Index Page
 *
 * This page handles direct navigation to /student/lessons (without a lesson ID).
 * It redirects to the student dashboard where the lessons list is displayed.
 *
 * The actual lesson practice is at /student/lessons/[id].
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'education', path: '/student/lessons', locale, noIndex: true });
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function StudentLessonsPage({ params }: PageProps) {
  const { locale } = await params;

  // Redirect to student dashboard where lessons are displayed
  redirect(`/${locale}/student`);
}
