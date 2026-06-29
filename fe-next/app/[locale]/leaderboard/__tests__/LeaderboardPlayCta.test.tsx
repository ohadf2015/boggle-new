import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
const trackShown = vi.fn();
const trackClicked = vi.fn();
let variant: 'control' | 'play-cta' = 'play-cta';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant, trackExposure: vi.fn() }) }));
vi.mock('@/utils/posthogEngagement', () => ({
  trackLeaderboardPlayCtaShown: (...a: unknown[]) => trackShown(...a),
  trackLeaderboardPlayCtaClicked: (...a: unknown[]) => trackClicked(...a),
}));

import { LeaderboardPlayCta } from '../LeaderboardPlayCta';

describe('LeaderboardPlayCta (exp-leaderboard-play-cta-v1)', () => {
  beforeEach(() => { vi.clearAllMocks(); variant = 'play-cta'; });

  it('renders the strip + fires shown in the play-cta arm', () => {
    render(<LeaderboardPlayCta language="en" />);
    expect(screen.getByTestId('leaderboard-play-cta')).toBeInTheDocument();
    expect(trackShown).toHaveBeenCalledWith({ variant: 'play-cta' });
  });

  it('click tracks + navigates to the game', () => {
    render(<LeaderboardPlayCta language="en" />);
    fireEvent.click(screen.getByText('common.playNow'));
    expect(trackClicked).toHaveBeenCalledWith({ variant: 'play-cta' });
    expect(push).toHaveBeenCalledWith('/en/singleplayer');
  });

  it('renders nothing + fires no event in control', () => {
    variant = 'control';
    render(<LeaderboardPlayCta language="en" />);
    expect(screen.queryByTestId('leaderboard-play-cta')).not.toBeInTheDocument();
    expect(trackShown).not.toHaveBeenCalled();
  });
});
