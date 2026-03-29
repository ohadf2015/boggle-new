import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import TeacherPageClient from './PageClient';

export default function TeacherPage() {
  return <TeacherPageClient />;
}
