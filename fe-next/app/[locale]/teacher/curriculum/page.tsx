// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import CurriculumPageClient from './PageClient';

export default function TeacherCurriculumPage() {
  return <CurriculumPageClient />;
}
