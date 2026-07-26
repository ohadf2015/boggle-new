/**
 * GameFeedbackCard — Post-game sentiment rating survey tests
 *
 * POLICY: Only renders when eligible=true (rematch CTA is visible).
 * Gated by useGameFeedback which enforces:
 *   - Min 2 games played
 *   - 3-day cooldown between prompts
 *   - Per-surface session de-dupe
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

const mockUseGameFeedback = vi.fn();
vi.mock('@/hooks/useGameFeedback', () => ({
  useGameFeedback: (args: unknown) => mockUseGameFeedback(args),
}));

const mockUseExperiment = vi.fn();
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: (key: string) => mockUseExperiment(key),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

import GameFeedbackCard from '../GameFeedbackCard';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseExperiment.mockReturnValue({ variant: 'control' });
  mockUseLanguage.mockReturnValue({
    t: (key: string) => {
      const map: Record<string, string> = {
        'gameFeedback.prompt': 'How was that round?',
        'gameFeedback.bad': 'Meh',
        'gameFeedback.ok': 'Good',
        'gameFeedback.great': 'Loved it!',
        'gameFeedback.thanks': 'Thanks for the feedback!',
        'gameFeedback.dismiss': 'Dismiss',
        'gameFeedback.issueProbe.prompt': 'What made it feel that way?',
        'gameFeedback.issueProbe.botsStrong': 'Bots too strong',
        'gameFeedback.issueProbe.technical': 'Technical issue',
      };
      return map[key] || key;
    },
  });
});

describe('GameFeedbackCard', () => {
  it('renders nothing when isOpen=false', () => {
    mockUseGameFeedback.mockReturnValue({
      shouldShow: true,
      recordRating: vi.fn(),
      dismiss: vi.fn(),
    });

    const { container } = render(
      <GameFeedbackCard
        isOpen={false}
        onClose={vi.fn()}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when shouldShow=false (throttled by useGameFeedback)', () => {
    mockUseGameFeedback.mockReturnValue({
      shouldShow: false,
      recordRating: vi.fn(),
      dismiss: vi.fn(),
    });

    const { container } = render(
      <GameFeedbackCard
        isOpen={true}
        onClose={vi.fn()}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen=true AND shouldShow=true', () => {
    mockUseGameFeedback.mockReturnValue({
      shouldShow: true,
      recordRating: vi.fn(),
      dismiss: vi.fn(),
    });

    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={vi.fn()}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    expect(screen.getByText('How was that round?')).toBeInTheDocument();
  });

  it('calls recordRating when user selects bad rating', () => {
    const recordRating = vi.fn();
    mockUseGameFeedback.mockReturnValue({
      shouldShow: true,
      recordRating,
      dismiss: vi.fn(),
    });

    const onClose = vi.fn();
    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={onClose}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    const buttons = screen.getAllByRole('button');
    // First button is the "Meh" rating
    fireEvent.click(buttons[0]);

    expect(recordRating).toHaveBeenCalledWith('bad');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls recordRating when user selects ok rating', () => {
    const recordRating = vi.fn();
    mockUseGameFeedback.mockReturnValue({
      shouldShow: true,
      recordRating,
      dismiss: vi.fn(),
    });

    const onClose = vi.fn();
    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={onClose}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    const buttons = screen.getAllByRole('button');
    // Second button is the "Good" rating
    fireEvent.click(buttons[1]);

    expect(recordRating).toHaveBeenCalledWith('ok');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls recordRating when user selects great rating', () => {
    const recordRating = vi.fn();
    mockUseGameFeedback.mockReturnValue({
      shouldShow: true,
      recordRating,
      dismiss: vi.fn(),
    });

    const onClose = vi.fn();
    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={onClose}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    const buttons = screen.getAllByRole('button');
    // Third button is the "Loved it" rating
    fireEvent.click(buttons[2]);

    expect(recordRating).toHaveBeenCalledWith('great');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls dismiss when user clicks Dismiss', () => {
    const dismiss = vi.fn();
    mockUseGameFeedback.mockReturnValue({
      shouldShow: true,
      recordRating: vi.fn(),
      dismiss,
    });

    const onClose = vi.fn();
    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={onClose}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    fireEvent.click(screen.getByText('Dismiss'));

    expect(dismiss).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('passes eligible gate to useGameFeedback', () => {
    mockUseGameFeedback.mockReturnValue({
      shouldShow: false,
      recordRating: vi.fn(),
      dismiss: vi.fn(),
    });

    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={vi.fn()}
        surface="singleplayer"
        eligible={true}
        gameMode="classic"
      />
    );

    expect(mockUseGameFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: true,
        surface: 'singleplayer',
        gameMode: 'classic',
      })
    );
  });

  it('respects eligible=false gate (rematch CTA not visible yet)', () => {
    mockUseGameFeedback.mockReturnValue({
      shouldShow: false,
      recordRating: vi.fn(),
      dismiss: vi.fn(),
    });

    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={vi.fn()}
        surface="singleplayer"
        eligible={false}
        gameMode="classic"
      />
    );

    expect(mockUseGameFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: false,
      })
    );
  });
});

/**
 * exp-mp-round-issue-probe-v1 — follow-up "what went wrong?" step after a
 * bad/ok rating on the MP round surface only. The control arm MUST keep the
 * close-immediately behaviour asserted above.
 */
describe('GameFeedbackCard — issue probe experiment', () => {
  const renderProbe = (onClose = vi.fn(), surface: 'mp_round' | 'singleplayer' = 'mp_round') => {
    mockUseGameFeedback.mockReturnValue({
      shouldShow: true,
      recordRating: vi.fn(),
      dismiss: vi.fn(),
    });
    render(
      <GameFeedbackCard
        isOpen={true}
        onClose={onClose}
        surface={surface}
        eligible={true}
        gameMode="classic"
      />
    );
    return onClose;
  };

  it('shows the probe after a bad rating when in the issue-probe arm on mp_round', () => {
    mockUseExperiment.mockReturnValue({ variant: 'issue-probe' });
    const onClose = renderProbe();

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('What made it feel that way?')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes immediately on a great rating even in the issue-probe arm', () => {
    mockUseExperiment.mockReturnValue({ variant: 'issue-probe' });
    const onClose = renderProbe();

    fireEvent.click(screen.getAllByRole('button')[2]);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not show the probe on non-mp surfaces', () => {
    mockUseExperiment.mockReturnValue({ variant: 'issue-probe' });
    const onClose = renderProbe(vi.fn(), 'singleplayer');

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(screen.queryByText('What made it feel that way?')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('tracks the selected issue and closes', () => {
    mockUseExperiment.mockReturnValue({ variant: 'issue-probe' });
    const onClose = renderProbe();

    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('Bots too strong'));

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('mp_round_issue_selected', {
      issue: 'bots_too_strong',
      gameMode: 'classic',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('reads the experiment under its registered flag key', () => {
    mockUseExperiment.mockReturnValue({ variant: 'control' });
    renderProbe();

    expect(mockUseExperiment).toHaveBeenCalledWith('exp-mp-round-issue-probe-v1');
  });
});
