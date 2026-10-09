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

  it('a host who plays gets the same coach as a joining player', () => {
    expect(src('host/HostView.tsx')).toMatch(/<MpModeCoach \/>/);
    expect(src('player/PlayerView.tsx')).toMatch(/<MpModeCoach \/>/);
  });
});
