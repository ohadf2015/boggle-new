import type { Metadata } from 'next';
import { WordTowerV2PageClient } from '../PageClient';
import { DailyFlowChrome } from '@/components/daily/flow/DailyFlowChrome';

// Daily run URLs are user-specific and time-based — keep out of the index.
// The game mode itself (/word-tower) is public and indexable.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Word Tower Daily',
  robots: { index: false, follow: false },
};

export default function WordTowerV2DailyPage() {
  return (
    <>
      <DailyFlowChrome modeId="word-tower" backLink={false} />
      <WordTowerV2PageClient daily />
    </>
  );
}
