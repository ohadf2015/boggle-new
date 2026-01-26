// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import LessonPracticePageClient from './PageClient';

export default function LessonPracticePage() {
  return <LessonPracticePageClient />;
}
