import type { Metadata } from 'next';
import ComebackTestPageClient from './PageClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ComebackTestPage() {
  return <ComebackTestPageClient />;
}
