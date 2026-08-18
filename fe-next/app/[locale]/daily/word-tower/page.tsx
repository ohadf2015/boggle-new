import type { Metadata } from 'next';
import { WordTowerPageClient } from '../../word-tower/PageClient';

/**
 * Daily Word Tower — the canonical route for the daily run.
 *
 * Sits under `/daily/*` with its Word Hunt and Word Wheel siblings so the hub can
 * link it the same way (SPA nav) and it inherits the daily layout. `/word-tower`
 * still resolves to the same client for older links; there is only ever one run —
 * the standalone endless mode was retired (see `WordTowerGame`, where `daily` is a
 * hardcoded const), so both paths render the same thing.
 *
 * noindex matches `/daily/word-hunt`: the playable surface is not the landing page.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Word Tower',
  robots: { index: false, follow: false },
};

export default function DailyWordTowerPage() {
  return <WordTowerPageClient />;
}
