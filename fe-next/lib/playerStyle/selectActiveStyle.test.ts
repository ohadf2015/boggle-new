import { describe, it, expect } from 'vitest';
import { selectActiveStyleKey } from './selectActiveStyle';

describe('selectActiveStyleKey (account-vs-guest routing)', () => {
  it('prefers the profile style when authenticated', () => {
    expect(selectActiveStyleKey(true, 'jazz', 'rock')).toBe('jazz');
  });

  it('falls back to the stored style when authed but profile has none', () => {
    expect(selectActiveStyleKey(true, null, 'rock')).toBe('rock');
  });

  it('uses the stored style when not authenticated (ignores profile)', () => {
    expect(selectActiveStyleKey(false, 'jazz', 'rock')).toBe('rock');
  });

  it('returns default when nothing is chosen anywhere', () => {
    expect(selectActiveStyleKey(false, null, null)).toBe('default');
    expect(selectActiveStyleKey(true, null, null)).toBe('default');
  });

  it('rejects an invalid profile value and falls through', () => {
    expect(selectActiveStyleKey(true, 'garbage', 'rock')).toBe('rock');
    expect(selectActiveStyleKey(true, 'garbage', null)).toBe('default');
  });
});
