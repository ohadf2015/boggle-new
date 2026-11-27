import { describe, expect, it } from 'vitest';
import { blastStageSkin } from '../blastStageSkin';

describe('blastStageSkin', () => {
  it('arcade keeps the exact navy cascade badge and white length count', () => {
    expect(blastStageSkin(false)).toEqual({
      cascadeBadge: 'px-5 py-2 rounded-neo bg-neo-navy border-3 border-neo-black shadow-hard',
      cascadeWord: 'text-neo-lime font-neo-display text-xl font-black tracking-wide',
      wordLength: 'text-[10px] font-bold tabular-nums text-white',
    });
  });

  it('classroom puts both on cream / page ink with no navy or white', () => {
    const skin = Object.values(blastStageSkin(true)).join(' ');
    expect(skin).toContain('bg-edu-surface');
    expect(skin).not.toMatch(/bg-neo-navy|text-white|text-neo-lime(\s|$)/);
  });
});
