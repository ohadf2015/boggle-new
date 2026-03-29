import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import CurriculumPageClient from './PageClient';

export default function TeacherCurriculumPage() {
  return <CurriculumPageClient />;
}
