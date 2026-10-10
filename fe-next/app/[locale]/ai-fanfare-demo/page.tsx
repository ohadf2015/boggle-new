import type { Metadata } from 'next';
import AiFanfareDemoClient from './AiFanfareDemoClient';
import { notFoundInProduction } from '@/lib/devOnlyRoute';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'AI Fanfare Demo',
};

export default function AiFanfareDemoPage() {
  notFoundInProduction();
  return <AiFanfareDemoClient />;
}
