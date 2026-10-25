import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    register: vi.fn(),
    __loaded: true,
  },
}));

import { EDU_REHEARSAL_STARTED, trackEduRehearsalStarted } from '../rehearsalTelemetry';

describe('trackEduRehearsalStarted', () => {
  beforeEach(() => captureMock.mockReset());

  it('sends edu_rehearsal_started with snake_case props', () => {
    trackEduRehearsalStarted({ source: 'hq', mode: 'classic', classExists: false });
    expect(EDU_REHEARSAL_STARTED).toBe('edu_rehearsal_started');
    expect(captureMock).toHaveBeenCalledWith('edu_rehearsal_started', {
      source: 'hq',
      mode: 'classic',
      class_exists: false,
    });
  });

  it('never throws when PostHog does', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    expect(() => trackEduRehearsalStarted({ source: 'lobby', mode: 'blast', classExists: true })).not.toThrow();
  });
});
