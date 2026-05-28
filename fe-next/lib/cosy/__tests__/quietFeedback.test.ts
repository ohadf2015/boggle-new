import { describe, it, expect } from 'vitest';
import {
  shouldShowQuietFeedback,
  QUIET_FEEDBACK_EVENT,
  QUIET_FEEDBACK_MIN_INTERVAL_MS,
} from '../quietFeedback';

describe('quietFeedback throttle', () => {
  it('shows the first quiet celebration (no prior timestamp)', () => {
    expect(shouldShowQuietFeedback(null, 1000)).toBe(true);
  });

  it('suppresses a second celebration fired within the min interval (burst loops)', () => {
    // A loud call site (fireFireworks / fireLayeredCelebration) fires many
    // bursts in a tight loop. Calm mode must collapse them into ONE quiet beat.
    const now = 5000;
    expect(shouldShowQuietFeedback(now - 50, now)).toBe(false);
  });

  it('allows another celebration once the min interval has elapsed', () => {
    const now = 5000;
    expect(shouldShowQuietFeedback(now - (QUIET_FEEDBACK_MIN_INTERVAL_MS + 1), now)).toBe(true);
  });

  it('exposes a stable custom-event name for the chokepoint and the layer', () => {
    expect(QUIET_FEEDBACK_EVENT).toBe('lexiclash:quiet-celebrate');
  });
});
