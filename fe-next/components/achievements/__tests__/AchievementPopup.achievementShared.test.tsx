import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AchievementPopup from '../AchievementPopup';
import type { AchievementPayload } from '@/shared/types/socket';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playAchievementSound: vi.fn() }),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

vi.mock('../GoogleAnalytics', () => ({
  gameEvents: { achievementUnlock: vi.fn(), share: vi.fn() },
}));

vi.mock('../../utils/ogShare', () => ({
  getAchievementShareUrl: () => 'https://www.lexiclash.live/og/achievement',
  shareWithOgImage: vi.fn().mockResolvedValue(true),
}));

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

function socketAchievement(): AchievementPayload {
  return { key: 'first_word', icon: '🏆', count: 1 } as AchievementPayload;
}

describe('AchievementPopup achievement_shared telemetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires growth:achievement_shared with the achievement key on share click', async () => {
    const user = userEvent.setup();
    render(<AchievementPopup achievement={socketAchievement()} />);

    await user.click(screen.getByTitle('achievements.shareButton'));

    expect(trackGrowthEvent).toHaveBeenCalledWith('achievement_shared', {
      achievementId: 'first_word',
    });
  });
});
