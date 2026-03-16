import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

import TeacherProfilePageClient from './PageClient';

export default function TeacherProfilePage() {
  return <TeacherProfilePageClient />;
}
