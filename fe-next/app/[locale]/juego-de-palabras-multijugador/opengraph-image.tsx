import { renderLandingCard } from '@/lib/og/brand';
import { BoardArt } from '@/lib/og/arts';
import { BOARDS, ES_SCRABBLE_CARD } from '@/lib/og/landingCopy';

export const runtime = 'nodejs';
export const alt = 'Scrabble Online en Español - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return renderLandingCard('es', ES_SCRABBLE_CARD, <BoardArt data={BOARDS.es} lang="es" />);
}
