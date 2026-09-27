/**
 * Test: global listener renders a localized reveal card when a hidden achievement
 * fires on the bus, and ignores unknown ids.
 */

import { vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import HiddenAchievementListener from '../HiddenAchievementListener';
import { HIDDEN_ACHIEVEMENT_EVENT } from '@/lib/achievements/hiddenAchievementBus';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireFireworks: vi.fn(),
}));

function fire(id: string) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent(HIDDEN_ACHIEVEMENT_EVENT, { detail: { id } }),
    );
  });
}

describe('HiddenAchievementListener', () => {
  it('renders the localized title + description when an achievement fires', () => {
    render(<HiddenAchievementListener />);
    fire('board_sweep');

    expect(screen.getByText('hiddenAchievement.board_sweep.title')).toBeInTheDocument();
    expect(screen.getByText('hiddenAchievement.board_sweep.desc')).toBeInTheDocument();
  });

  it('shows the generic "secret unlocked" banner', () => {
    render(<HiddenAchievementListener />);
    fire('palindrome');

    expect(screen.getByText('hiddenAchievement.unlockedBanner')).toBeInTheDocument();
  });

  it('ignores an unknown achievement id', () => {
    render(<HiddenAchievementListener />);
    fire('not_a_real_achievement');

    expect(screen.queryByText('hiddenAchievement.unlockedBanner')).not.toBeInTheDocument();
  });
});
