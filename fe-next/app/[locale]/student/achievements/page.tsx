import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import StudentAchievementsPageClient from './PageClient';

export default function StudentAchievementsPage() {
  return <StudentAchievementsPageClient />;
}
