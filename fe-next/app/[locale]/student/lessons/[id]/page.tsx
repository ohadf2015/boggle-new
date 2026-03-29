import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import LessonPracticePageClient from './PageClient';

export default function LessonPracticePage() {
  return <LessonPracticePageClient />;
}
