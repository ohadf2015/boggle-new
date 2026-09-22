import type { Metadata } from 'next';
import { WordTowerV2PageClient } from '../PageClient';

// Beta daily preview — keep it out of the index. Public /daily/word-tower stays v1.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Word Tower v2 daily',
  robots: { index: false, follow: false },
};

export default function WordTowerV2DailyPage() {
  return <WordTowerV2PageClient daily />;
}
