import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

import LevelTopBar from '../LevelTopBar';
import { trackGrowthEvent } from '@/utils/growthTracking';

describe('LevelTopBar exit', () => {
  it('back button calls onExit and tracks adventure_exit event', () => {
    const onExit = vi.fn();
    const world = 3;

    render(
      <LevelTopBar
        worldName="Forest"
        levelLabel="Level 1"
        secs={60}
        urgent={false}
        onExit={onExit}
        world={world}
      />
    );

    const backButton = screen.getByRole('button', {
      name: 'adventurePlay.backToMap',
    });

    fireEvent.click(backButton);

    expect(trackGrowthEvent).toHaveBeenCalledOnce();
    expect(trackGrowthEvent).toHaveBeenCalledWith('adventure_exit', {
      from: 'level',
      world,
    });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('back button has aria-label for accessibility', () => {
    const onExit = vi.fn();

    render(
      <LevelTopBar
        worldName="Forest"
        levelLabel="Level 1"
        secs={60}
        urgent={false}
        onExit={onExit}
        world={1}
      />
    );

    const backButton = screen.getByRole('button', {
      name: 'adventurePlay.backToMap',
    });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute('aria-label', 'adventurePlay.backToMap');
  });
});
