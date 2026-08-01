import { describe, it, expect } from 'vitest';
import { connectionsPrimaryPath } from '../primaryPath';

describe('connectionsPrimaryPath — pyramid mode takes priority', () => {
  it('routes locales with a pyramid pool to pyramid mode', () => {
    expect(connectionsPrimaryPath('en')).toBe('/en/connections/pyramid');
    expect(connectionsPrimaryPath('he')).toBe('/he/connections/pyramid');
  });

  it('falls back to regular play when the locale has no pyramids', () => {
    expect(connectionsPrimaryPath('ja')).toBe('/ja/connections/play');
  });
});
