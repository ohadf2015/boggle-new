import { describe, it, expect } from 'vitest';
import { recordV2DailyClimb } from '../daily';

const mem = () => {
  const store: Record<string, string> = {};
  return { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) };
};

describe('recordV2DailyClimb — guest board name', () => {
  it('Given a chosen guest name, Then the submit body carries it', () => {
    const body = recordV2DailyClimb(
      { climbM: 8, floors: 3, longestWord: 'tower' },
      { language: 'en', guestFingerprint: 'g_1', displayName: 'Zigzag', storage: mem() },
    );
    expect(body).toMatchObject({ displayName: 'Zigzag' });
  });

  it('Given no chosen name, Then the body has no name field', () => {
    const body = recordV2DailyClimb(
      { climbM: 8, floors: 3, longestWord: 'tower' },
      { language: 'en', guestFingerprint: 'g_1', displayName: null, storage: mem() },
    );
    expect(body).not.toHaveProperty('displayName');
  });
});
