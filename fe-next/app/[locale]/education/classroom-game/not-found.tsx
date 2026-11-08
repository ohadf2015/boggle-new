import type { Metadata } from 'next';
import { EduNotFound } from '@/components/education/shell/EduNotFound';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NotFound() {
  return <EduNotFound />;
}
