import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import ReportsPageClient from './PageClient';

export default function TeacherReportsPage() {
  return <ReportsPageClient />;
}
