import type { Metadata } from 'next';
import PageClient from './PageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connection Puzzle Review — Admin',
  robots: { index: false, follow: false },
};

export default function ConnectionsReviewAdminPage() {
  return <PageClient />;
}
