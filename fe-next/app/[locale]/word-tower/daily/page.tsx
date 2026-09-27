import type { Metadata } from 'next';
import { WordTowerV2PageClient } from '../PageClient';

// Daily run URLs are user-specific and time-based — keep out of the index.
// The game mode itself (/word-tower) is public and indexable.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Word Tower Daily',
  robots: { index: false, follow: false },
};

export default function WordTowerV2DailyPage() {
  return <WordTowerV2PageClient daily />;
}
