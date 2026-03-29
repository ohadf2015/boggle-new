import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import StudentJoinPageClient from './PageClient';

export default function StudentJoinPage() {
  return <StudentJoinPageClient />;
}
