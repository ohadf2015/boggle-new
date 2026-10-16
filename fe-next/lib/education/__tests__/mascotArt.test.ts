import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { EDU_MASCOT, EDU_MASCOT_VIDEO } from '@/lib/education/mascotArt';

const pub = (p: string) => path.join(process.cwd(), 'public', p);

describe('EDU_MASCOT', () => {
  it('given the art map, then it has exactly the agreed poses', () => {
    expect(Object.keys(EDU_MASCOT).sort()).toEqual(
      ['attack', 'empty', 'error', 'gameStart', 'noClasses', 'podium', 'pro', 'setup', 'shield', 'success', 'tip', 'welcome'].sort()
    );
  });

  it('given every pose, then its still exists in public/', () => {
    for (const src of Object.values(EDU_MASCOT)) expect(existsSync(pub(src)), src).toBe(true);
  });

  it('given the looping poses, then video and poster exist', () => {
    expect(Object.keys(EDU_MASCOT_VIDEO).sort()).toEqual(['gameStart', 'success', 'welcome']);
    for (const v of Object.values(EDU_MASCOT_VIDEO)) {
      expect(existsSync(pub(v.src)), v.src).toBe(true);
      expect(existsSync(pub(v.poster)), v.poster).toBe(true);
    }
  });
});
