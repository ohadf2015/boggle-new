import { describe, it, expect, vi, beforeEach } from 'vitest';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));

import { RETEACH_STARTED_EVENT, trackReteachStarted } from '../trackResultsAction';

describe('trackReteachStarted', () => {
  beforeEach(() => capture.mockReset());

  it('records edu_reteach_started with the surface, word count and plan', () => {
    trackReteachStarted({ surface: 'projector', words: 4, plan: 'free' });
    expect(RETEACH_STARTED_EVENT).toBe('edu_reteach_started');
    expect(capture).toHaveBeenCalledWith('edu_reteach_started', { surface: 'projector', words: 4, plan: 'free' });
  });
});
