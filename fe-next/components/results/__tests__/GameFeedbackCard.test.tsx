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

import GameFeedbackCard from '../GameFeedbackCard';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseLanguage.mockReturnValue({
    t: (key: string) => {
      const map: Record<string, string> = {
        'gameFeedback.prompt': 'How was that round?',
        'gameFeedback.bad': 'Meh',
        'gameFeedback.ok': 'Good',
        'gameFeedback.great': 'Loved it!',
        'gameFeedback.thanks': 'Thanks for the feedback!',
        'gameFeedback.dismiss': 'Dismiss',
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
