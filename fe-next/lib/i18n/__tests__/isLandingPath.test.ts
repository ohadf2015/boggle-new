import { describe, it, expect } from 'vitest';
import { isLandingPath } from '../isLandingPath';

describe('isLandingPath', () => {
  it('treats locale roots as landing', () => {
    expect(isLandingPath('/en')).toBe(true);
    expect(isLandingPath('/en/')).toBe(true);
    expect(isLandingPath('/he')).toBe(true);
    expect(isLandingPath('/')).toBe(true);
  });

  it('rejects nested routes', () => {
    expect(isLandingPath('/en/daily')).toBe(false);
    expect(isLandingPath('/en/multiplayer')).toBe(false);
    expect(isLandingPath('/he/blog')).toBe(false);
  });

  it('rejects empty so a missing header keeps the full catalogue', () => {
    expect(isLandingPath('')).toBe(false);
  });
});
