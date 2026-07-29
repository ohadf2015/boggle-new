import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import InviteTutorialTeaser from '@/components/onboarding/InviteTutorialTeaser';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock InviteContextBanner — Task 4 already tests it in isolation. Same separation-of-concerns
// pattern used in QuickProfileSetup.test.tsx.
vi.mock('@/components/onboarding/InviteContextBanner', () => ({
  default: ({ roomCode, hostName, onSkip }: { roomCode: string; hostName?: string; onSkip: () => void }) => (
    <div data-testid="invite-banner">
      <span>{roomCode}</span>
      <span>{hostName}</span>
      <button data-testid="invite-banner-skip" onClick={onSkip}>skip</button>
    </div>
  ),
}));

const setup = (overrides: Partial<React.ComponentProps<typeof InviteTutorialTeaser>> = {}) => {
  const props = {
    roomCode: 'ABC123',
    hostName: 'Alice',
    onComplete: vi.fn(),
    onSkip: vi.fn(),
    ...overrides,
  };
  render(
    <LanguageProvider initialLanguage="en">
      <InviteTutorialTeaser {...props} />
    </LanguageProvider>,
  );
  return props;
};

describe('InviteTutorialTeaser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders preset 4-letter board (C, A, T, S)', () => {
    setup();
    expect(screen.getByTestId('teaser-tile-C')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-tile-A')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-tile-T')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-tile-S')).toBeInTheDocument();
  });

  it('renders sticky InviteContextBanner with skip CTA', () => {
    setup();
    expect(screen.getByTestId('invite-banner')).toBeInTheDocument();
    expect(screen.getByTestId('invite-banner-skip')).toBeInTheDocument();
  });

  it('skip CTA fires onSkip', () => {
    const { onSkip } = setup();
    fireEvent.click(screen.getByTestId('invite-banner-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('finding a valid word fires onComplete after 1.2s', () => {
    const { onComplete } = setup();
    fireEvent.click(screen.getByTestId('teaser-tile-C'));
    fireEvent.click(screen.getByTestId('teaser-tile-A'));
    fireEvent.click(screen.getByTestId('teaser-tile-T'));
    fireEvent.click(screen.getByTestId('teaser-submit'));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid words without firing onComplete', () => {
    const { onComplete } = setup();
    // 'TC' is not in VALID_TEASER_WORDS and is below 3-letter minimum
    fireEvent.click(screen.getByTestId('teaser-tile-T'));
    fireEvent.click(screen.getByTestId('teaser-tile-C'));
    fireEvent.click(screen.getByTestId('teaser-submit'));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('rejects gibberish words even when ≥3 letters', () => {
    const { onComplete } = setup();
    // 'TCS' is 3 letters but NOT in VALID_TEASER_WORDS
    fireEvent.click(screen.getByTestId('teaser-tile-T'));
    fireEvent.click(screen.getByTestId('teaser-tile-C'));
    fireEvent.click(screen.getByTestId('teaser-tile-S'));
    fireEvent.click(screen.getByTestId('teaser-submit'));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clear button resets selection', () => {
    setup();
    fireEvent.click(screen.getByTestId('teaser-tile-C'));
    fireEvent.click(screen.getByTestId('teaser-tile-A'));
    fireEvent.click(screen.getByTestId('teaser-clear'));
    // After clear, the current-word display shows the empty placeholder
    expect(screen.getByTestId('teaser-current-word').textContent?.trim()).toBe('—');
  });
});
