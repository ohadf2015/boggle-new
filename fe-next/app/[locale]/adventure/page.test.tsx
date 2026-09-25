import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdventurePage from './page';

// Mock dependencies
vi.mock('./PageClient', () => ({
  default: () => <div data-testid="page-client">Game Client</div>,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

describe('Adventure SEO Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders play button with correct href and fires trackGrowthEvent', async () => {
    const component = await AdventurePage({ params: Promise.resolve({ locale: 'en' }) });
    render(component);

    const button = screen.getByRole('link', { name: /play/i });
    expect(button).toHaveAttribute('href', '/en/adventure');
    expect(button).toHaveAttribute('data-mode-landing-cta', 'adventure');

    const user = userEvent.setup();
    await user.click(button);

    const { trackGrowthEvent } = await import('@/utils/growthTracking');
    expect(trackGrowthEvent).toHaveBeenCalledWith('mode_landing_play_clicked', {
      mode: 'adventure',
    });
  });

  it('renders Hebrew label on /he locale', async () => {
    const component = await AdventurePage({ params: Promise.resolve({ locale: 'he' }) });
    render(component);

    const button = screen.getByRole('link', { name: /שחק/i });
    expect(button).toHaveAttribute('href', '/he/adventure');
  });

  it('renders FAQ with correct structure', async () => {
    const component = await AdventurePage({ params: Promise.resolve({ locale: 'en' }) });
    render(component);

    // Check that FAQ section is visible
    const adventureTitleRegex = /word adventure|RPG|adventure/i;
    const faqSection = screen.getByLabelText(adventureTitleRegex);
    expect(faqSection).toBeInTheDocument();
  });
});
