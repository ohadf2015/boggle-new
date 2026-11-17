import { describe, expect, it, beforeEach } from 'vitest';
import { dismissRivalCoach, shouldShowRivalCoach } from '../rivalCoach';

describe('rivalCoach', () => {
  beforeEach(() => localStorage.clear());

  it('shows the tip until it is dismissed, and then stays dismissed', () => {
    expect(shouldShowRivalCoach()).toBe(true);
    dismissRivalCoach();
    expect(shouldShowRivalCoach()).toBe(false);
  });
});
