import { renderLandingCard } from '@/lib/og/brand';
import { BoardArt } from '@/lib/og/arts';
import { BOARDS, PLAY_BOGGLE_CARD } from '@/lib/og/landingCopy';

export const runtime = 'nodejs';
export const alt = 'Play Boggle Online Free - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return renderLandingCard('en', PLAY_BOGGLE_CARD, <BoardArt data={BOARDS.en} lang="en" />);
}
