// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import StudentAchievementsPageClient from './PageClient';

export default function StudentAchievementsPage() {
  return <StudentAchievementsPageClient />;
}
