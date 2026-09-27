import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeLandingPlayButton } from './ModeLandingPlayButton';

// Mock the growth tracking module
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

describe('ModeLandingPlayButton', () => {
  it('renders play button with correct href', () => {
    render(<ModeLandingPlayButton mode="adventure" href="/en/adventure" />);
    const button = screen.getByRole('link', { name: /play/i });
    expect(button).toHaveAttribute('href', '/en/adventure');
  });

  it('fires trackGrowthEvent when clicked', async () => {
    const { trackGrowthEvent } = await import('@/utils/growthTracking');
    const user = userEvent.setup();

    render(<ModeLandingPlayButton mode="word-tower" href="/en/word-tower" />);
    const button = screen.getByRole('link');

    await user.click(button);

    expect(trackGrowthEvent).toHaveBeenCalledWith('mode_landing_play_clicked', {
      mode: 'word-tower',
    });
  });

  it('tracks adventure mode correctly', async () => {
    const { trackGrowthEvent } = await import('@/utils/growthTracking');
    const user = userEvent.setup();

    render(<ModeLandingPlayButton mode="adventure" href="/en/adventure" />);
    const button = screen.getByRole('link');

    await user.click(button);

    expect(trackGrowthEvent).toHaveBeenCalledWith('mode_landing_play_clicked', {
      mode: 'adventure',
    });
  });
});
