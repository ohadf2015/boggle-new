// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import TeacherPageClient from './PageClient';

export default function TeacherPage() {
  return <TeacherPageClient />;
}
