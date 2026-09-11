/**
 * Every duel surface art path must resolve to a file that actually ships.
 *
 * A missing mascot clip or sticker is invisible to a component test — <video>
 * and <img> fail silently in jsdom AND in the browser (the poster stays up, the
 * alt text never shows). That is recurring-pitfalls Class 4: a no-op that emits
 * nothing and looks identical to "working". This test is the alert.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { DUEL_REVEAL_CLIPS } from '@/lib/education/duelReveal';
import { DUEL_TAUNTS } from '@/lib/education/duelTaunts';
import { DUEL_COMBO_TIERS, duelComboTier } from '@/lib/education/duelCombo';

const PUBLIC_DIR = join(process.cwd(), 'public');

function shipsInPublic(publicPath: string): boolean {
  return existsSync(join(PUBLIC_DIR, publicPath.replace(/^\//, '')));
}

describe('duel art assets', () => {
  describe('reveal clips', () => {
    it.each(Object.entries(DUEL_REVEAL_CLIPS))(
      '%s clip video exists in public/',
      (_outcome, clip) => {
        expect(shipsInPublic(clip.src)).toBe(true);
      }
    );

    it.each(Object.entries(DUEL_REVEAL_CLIPS))(
      '%s clip poster exists in public/',
      (_outcome, clip) => {
        expect(shipsInPublic(clip.poster)).toBe(true);
      }
    );

    it('covers win, loss and draw', () => {
      expect(Object.keys(DUEL_REVEAL_CLIPS).sort()).toEqual(['draw', 'loss', 'win']);
    });
  });

  describe('taunt stickers', () => {
    it('offers exactly four stickers', () => {
      expect(DUEL_TAUNTS).toHaveLength(4);
    });

    it.each(DUEL_TAUNTS.map((taunt) => [taunt.id, taunt.src]))(
      'sticker %s exists in public/',
      (_id, src) => {
        expect(shipsInPublic(src)).toBe(true);
      }
    );
  });

  describe('combo tier mascots', () => {
    it.each(DUEL_COMBO_TIERS.map((tier) => [tier.id, tier.mascotSrc]))(
      'tier %s mascot exists in public/',
      (_id, src) => {
        expect(shipsInPublic(src)).toBe(true);
      }
    );

    it('the resting (no chain) mascot exists too', () => {
      expect(shipsInPublic(duelComboTier(0).mascotSrc)).toBe(true);
    });
  });
});
