/**
 * Drill scroll-safety guard.
 *
 * Brain Gym drills run inside `screen-fit-locked` (NavigationContext flips the
 * body to `height:100dvh; overflow:hidden` while `isInGame` is true). The tall
 * `ready`/briefing phase therefore CANNOT rely on the page scrolling — if the
 * drill's own game-area doesn't scroll, the "Let's train!" CTA is clipped below
 * the fold and the player sees "only explanation, no play button".
 *
 * This guard pins the CSS contract that keeps the CTA reachable:
 *  - the game-area is its own scroll container (`overflow-y-auto` + `min-h-0`),
 *  - it does NOT center on the main axis (`justify-center` clips both ends under
 *    overflow — top-anchored `justify-start` scrolls correctly),
 *  - every flex ancestor down to the game-area carries `min-h-0` so the bounded
 *    height from the locked body actually reaches it.
 *
 * Layout reachability isn't unit-testable in jsdom (no layout engine), so this
 * is a source-contract regression guard, not a visual assertion.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const DRILLS = [
  'RareGems',
  'LightningRound',
  'MemoryHunt',
  'ComboMaster',
  'PatternSwitcher',
] as const;

const PAGE_CLIENTS = [
  'rare-gems',
  'lightning-round',
  'memory-hunt',
  'combo-master',
  'pattern-switcher',
] as const;

const drillsDir = join(__dirname, '..');
const drillPagesDir = join(__dirname, '../../../app/[locale]/brain/drills');

describe('drill scroll-safety (CTA reachable under screen-fit-locked)', () => {
  for (const drill of DRILLS) {
    it(`${drill}: game-area is an internal scroll container`, () => {
      const src = readFileSync(join(drillsDir, `${drill}.tsx`), 'utf8');
      // The game-area line that wraps the phase blocks.
      const gameAreaLine = src
        .split('\n')
        .find((l) => l.includes('flex-1') && l.includes('flex flex-col') && l.includes('items-center'));
      expect(gameAreaLine, `${drill} game-area line`).toBeTruthy();
      expect(gameAreaLine!).toContain('overflow-y-auto');
      // overflow-y-auto computes overflow-x:auto unless x is explicitly clipped;
      // without this a stray horizontal scrollbar can appear.
      expect(gameAreaLine!).toContain('overflow-x-hidden');
      expect(gameAreaLine!).toContain('min-h-0');
      // justify-center clips both ends when content overflows the locked viewport.
      expect(gameAreaLine!).not.toContain('justify-center');
    });
  }

  for (const slug of PAGE_CLIENTS) {
    it(`${slug}: page shell propagates min-h-0 down to the drill`, () => {
      const src = readFileSync(join(drillPagesDir, slug, 'PageClient.tsx'), 'utf8');
      // Root flex column must be able to shrink (min-h-0) so the locked-body
      // height reaches the drill instead of being absorbed by intrinsic height.
      expect(src, `${slug} root`).toContain("'flex-1 flex flex-col min-h-0'");
      // The "Drill Content" wrapper must also shrink so the drill's h-full resolves.
      expect(src, `${slug} drill wrapper`).toContain('className="flex-1 min-h-0"');
    });
  }
});
