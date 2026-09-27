import { describe, it, expect } from 'vitest';
import { arrivalsSince } from '../projectorLobbyModel';

describe('arrivalsSince — who just walked in (drives the join SFX)', () => {
  it('is silent on the first paint: students already in the room are not arrivals', () => {
    expect(arrivalsSince(null, ['Maya', 'Leo'])).toEqual([]);
  });

  it('names only the students who were not there last render', () => {
    expect(arrivalsSince(['Maya'], ['Maya', 'Leo', 'Noa'])).toEqual(['Leo', 'Noa']);
  });

  it('treats a leave as no arrival', () => {
    expect(arrivalsSince(['Maya', 'Leo'], ['Maya'])).toEqual([]);
  });
});
