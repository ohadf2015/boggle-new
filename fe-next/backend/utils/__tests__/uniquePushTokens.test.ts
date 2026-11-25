import { describe, it, expect } from 'vitest';
import { uniquePushTokens } from '../uniquePushTokens';

describe('uniquePushTokens', () => {
  it('keeps one row per token string so a device stored twice gets one push', () => {
    const rows = [
      { id: 'a', user_id: 'u1', token: 'T1' },
      { id: 'b', user_id: 'u1', token: 'T2' },
      { id: 'c', user_id: 'u1', token: 'T1' },
    ];
    expect(uniquePushTokens(rows).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('returns an empty list unchanged', () => {
    expect(uniquePushTokens([])).toEqual([]);
  });
});
