import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import StudentPageClient from './PageClient';

export default function StudentPage() {
  return <StudentPageClient />;
}
