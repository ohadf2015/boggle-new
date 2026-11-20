import { renderLandingCard } from '@/lib/og/brand';
import { BoardArt } from '@/lib/og/arts';
import { BOARDS, SV_SCRABBLE_CARD } from '@/lib/og/landingCopy';

export const runtime = 'nodejs';
export const alt = 'Spela Scrabble Svenska - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return renderLandingCard('sv', SV_SCRABBLE_CARD, <BoardArt data={BOARDS.sv} lang="sv" />);
}
