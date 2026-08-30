import type { Metadata } from 'next';
import { WordTowerV2PageClient } from './PageClient';

// Dev-preview surface for the v2 rebuild — keep it out of the index.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Word Tower v2',
  robots: { index: false, follow: false },
};

export default function WordTowerV2Page() {
  return <WordTowerV2PageClient />;
}
