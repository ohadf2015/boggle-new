import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenMpBlastIntro, markMpBlastIntroSeen, MP_BLAST_INTRO_KEY } from '../mpBlastIntro';

describe('mpBlastIntro latch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports not-seen by default', () => {
    expect(hasSeenMpBlastIntro()).toBe(false);
  });

  it('reports seen after marking, and persists the flag', () => {
    markMpBlastIntroSeen();
    expect(hasSeenMpBlastIntro()).toBe(true);
    expect(localStorage.getItem(MP_BLAST_INTRO_KEY)).toBe('1');
  });

  it('marking is idempotent', () => {
    markMpBlastIntroSeen();
    markMpBlastIntroSeen();
    expect(hasSeenMpBlastIntro()).toBe(true);
  });
});
