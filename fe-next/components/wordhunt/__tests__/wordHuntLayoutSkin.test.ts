import { describe, expect, it } from 'vitest';
import { wordHuntLayoutSkin } from '../wordHuntLayoutSkin';

describe('wordHuntLayoutSkin', () => {
  it('arcade keeps the exact navy skeleton and white heal hint', () => {
    expect(wordHuntLayoutSkin(false)).toEqual({
      healHint: 'shrink-0 px-2 text-center text-[11px] sm:text-xs font-neo-body text-neo-white leading-tight',
      skeleton: 'mx-auto max-w-3xl w-full px-3 py-2 mb-0.5 rounded-neo-lg bg-neo-navy/30 dark:bg-neo-navy/50 border-2 border-neo-black/20 animate-pulse',
      skeletonTitle: 'text-center mb-2 text-xl sm:text-2xl font-black text-neo-white',
      skeletonTile: 'w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-2 rounded-neo font-bold shadow-hard bg-neo-black/60 border-neo-black text-neo-white',
    });
  });

  it('classroom paints cream and page ink with no navy or white', () => {
    const skin = Object.values(wordHuntLayoutSkin(true)).join(' ');
    expect(skin).toContain('bg-edu-surface');
    expect(skin).not.toMatch(/bg-neo-navy|text-neo-white|bg-neo-black/);
  });
});
