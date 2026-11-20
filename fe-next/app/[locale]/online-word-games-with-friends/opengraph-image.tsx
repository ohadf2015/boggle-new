import { renderLandingCard } from '@/lib/og/brand';
import { BoardArt } from '@/lib/og/arts';
import { BOARDS, FRIENDS_CARD } from '@/lib/og/landingCopy';

export const runtime = 'nodejs';
export const alt = 'Word Games With Friends - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return renderLandingCard('en', FRIENDS_CARD, <BoardArt data={BOARDS.en} lang="en" />);
}
