import type { Metadata } from 'next';
import ComebackTestPageClient from './PageClient';
import { notFoundInProduction } from '@/lib/devOnlyRoute';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ComebackTestPage() {
  await notFoundInProduction();
  return <ComebackTestPageClient />;
}
