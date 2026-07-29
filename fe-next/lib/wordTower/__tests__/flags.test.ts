import { describe, it, expect } from 'vitest';
import { flagFromQuery, resolveWordTowerEnabled, WORD_TOWER_GAME_FLAG } from '../flags';

describe('flagFromQuery', () => {
  it('reads truthy/falsey overrides, undefined when absent', () => {
    expect(flagFromQuery('?word-tower=1', 'word-tower')).toBe(true);
    expect(flagFromQuery('?word-tower=true', 'word-tower')).toBe(true);
    expect(flagFromQuery('?word-tower=on', 'word-tower')).toBe(true);
    expect(flagFromQuery('?word-tower=0', 'word-tower')).toBe(false);
    expect(flagFromQuery('?word-tower=false', 'word-tower')).toBe(false);
    expect(flagFromQuery('?other=1', 'word-tower')).toBeUndefined();
    expect(flagFromQuery('', 'word-tower')).toBeUndefined();
  });
});

describe('resolveWordTowerEnabled', () => {
  it('uses the PostHog flag value when there is no query override', () => {
    expect(resolveWordTowerEnabled(true, '')).toBe(true);
    expect(resolveWordTowerEnabled(false, '')).toBe(false);
  });

  it('lets a query override win over PostHog (founder live-verify)', () => {
    expect(resolveWordTowerEnabled(false, '?word-tower=1')).toBe(true);
    expect(resolveWordTowerEnabled(true, '?word-tower=0')).toBe(false);
  });

  it('defaults the whole game OFF until rolled out (admins access separately)', () => {
    expect(WORD_TOWER_GAME_FLAG.default).toBe(false);
  });
});
