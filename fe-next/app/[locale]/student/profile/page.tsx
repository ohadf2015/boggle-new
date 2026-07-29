import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import StudentProfilePageClient from './PageClient';

export default function StudentProfilePage() {
  return <StudentProfilePageClient />;
}
