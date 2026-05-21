import type { Metadata } from 'next';
import { WordTowerPageClient } from './PageClient';

// Admin-only dev-preview mode — keep it out of the index.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Word Tower',
  robots: { index: false, follow: false },
};

export default function WordTowerPage() {
  return <WordTowerPageClient />;
}
