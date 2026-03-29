import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import ReportsPageClient from './PageClient';

export default function TeacherReportsPage() {
  return <ReportsPageClient />;
}
