import { describe, it, expect } from 'vitest';
import { moodToOverlay } from '@/lib/avatar/avatarOverlay';

describe('moodToOverlay', () => {
  it('shows a loud "alert" badge when overtaken (emoteShock)', () => {
    expect(moodToOverlay('emoteShock')).toBe('alert');
  });

  it('shows a "flame" badge on a streak / big word', () => {
    expect(moodToOverlay('streak')).toBe('flame');
  });

  it('shows NO overlay for an ordinary score (avoids per-word badge noise)', () => {
    expect(moodToOverlay('correct')).toBeNull();
  });

  it('shows no overlay at idle / undefined', () => {
    expect(moodToOverlay('idle')).toBeNull();
    expect(moodToOverlay(undefined)).toBeNull();
  });

  it('shows no overlay for unrelated moods (win/lose/thinking/lobby emotes)', () => {
    expect(moodToOverlay('win')).toBeNull();
    expect(moodToOverlay('lose')).toBeNull();
    expect(moodToOverlay('thinking')).toBeNull();
    expect(moodToOverlay('emoteLaugh')).toBeNull();
  });
});
