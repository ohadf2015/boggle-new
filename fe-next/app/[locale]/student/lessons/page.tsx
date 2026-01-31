/**
 * Student Lessons Index Page
 *
 * This page handles direct navigation to /student/lessons (without a lesson ID).
 * It redirects to the student dashboard where the lessons list is displayed.
 *
 * The actual lesson practice is at /student/lessons/[id].
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function StudentLessonsPage({ params }: PageProps) {
  const { locale } = await params;

  // Redirect to student dashboard where lessons are displayed
  redirect(`/${locale}/student`);
}
