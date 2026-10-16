import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { mpCoachMode } from '@/lib/tutorial/mpCoachMode';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('multiplayer mode coach', () => {
  it.each([
    ['classic', 'classic'],
    ['blast', 'blast'],
    ['word-hunt', 'wordHunt'],
    ['wheel-rush', 'wheelRush'],
    ['crossword', 'crossword'],
  ])('maps the %s round to the %s coach', (gm, key) => {
    expect(mpCoachMode(gm)).toBe(key);
  });

  it('has no coach for unknown or missing modes', () => {
    expect(mpCoachMode(undefined)).toBeUndefined();
    expect(mpCoachMode('not-a-mode')).toBeUndefined();
  });

  it('a host who plays and a joining player learn the mode in the same 3-2-1, never from a card over the live board', () => {
    for (const view of ['host/HostView.tsx', 'player/PlayerView.tsx']) {
      expect(src(view)).toMatch(/<MpCountdown\b/);
      expect(src(view)).not.toMatch(/ModeCoach/);
    }
  });
});
