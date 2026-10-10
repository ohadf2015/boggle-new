import type { Metadata } from 'next';
import ComebackTestPageClient from './PageClient';
import { notFoundInProduction } from '@/lib/devOnlyRoute';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ComebackTestPage() {
  notFoundInProduction();
  return <ComebackTestPageClient />;
}
