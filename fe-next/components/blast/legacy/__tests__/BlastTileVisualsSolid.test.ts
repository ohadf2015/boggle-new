/**
 * Phase 2 — special-tile coherence contract.
 *
 * The live board mixed FLAT white standard tiles with GLOSSY radial/linear
 * gradient specials — two art styles that clash, and the soft gradients are an
 * explicit brand anti-reference. These tests pin the redesign decisions:
 *
 *  - Resting faces are SOLID (no soft radial/linear gradient) so specials read
 *    as neo-brutalist siblings of the standard tile, not airbrushed stickers.
 *  - Every special keeps its identity: an indicator icon + a visible border.
 *  - The destruction-phase tables (CLEARING_*) are intentionally NOT touched —
 *    a gradient burst over a 180–350ms death flash is on-energy.
 */
import { TILE_VISUALS, CLEARING_COLORS } from '../blastTileVisuals';
import type { BlastTileType } from '../types';

const SPECIALS: BlastTileType[] = [
  'gold', 'bomb', 'lightning', 'prism', 'rainbow', 'ice', 'gem', 'frozen',
  'magnet', 'diamond', 'countdown', 'shuffle', 'magma', 'portal', 'catalyst',
  'crystal', 'fuse', 'anchor',
];

function bg(type: BlastTileType): string {
  return (TILE_VISUALS[type].style?.background as string) ?? '';
}

describe('Blast tile visuals — solid neo-brutalist faces', () => {
  it('standard tile has a solid (non-gradient) face', () => {
    const b = bg('standard');
    expect(b).not.toMatch(/gradient/i);
    expect(b).not.toBe('');
  });

  it.each(SPECIALS)('%s resting face is solid — no soft gradient', (type) => {
    // Soft radial/linear gradients are the banned look. (prism/rainbow may carry
    // a hard-edged multi-colour BORDER, but the face itself must be solid.)
    expect(bg(type)).not.toMatch(/(radial|linear)-gradient/i);
  });

  it.each(SPECIALS)('%s keeps an indicator icon (identity preserved)', (type) => {
    expect(TILE_VISUALS[type].indicator).toBeTruthy();
  });

  it.each(SPECIALS)('%s keeps a visible border (neo frame)', (type) => {
    expect(TILE_VISUALS[type].style?.border).toBeTruthy();
  });

  it('does NOT flatten the destruction flashes (CLEARING_* untouched)', () => {
    // A couple of clearing entries still legitimately use gradients.
    expect(CLEARING_COLORS.bomb?.background).toMatch(/gradient/i);
  });
});
