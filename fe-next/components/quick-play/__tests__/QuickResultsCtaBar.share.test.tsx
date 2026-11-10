import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuickResultsCtaBar } from '../QuickResultsNextActions';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

const renderBar = (onChallenge: () => Promise<unknown>, isGuest = false) =>
  render(
    <QuickResultsCtaBar currentMode="word-hunt" onNextRound={vi.fn()} onChallenge={onChallenge} shine={false} isGuest={isGuest} />,
  );

describe('QuickResultsCtaBar share', () => {
  it('Given a guest, When the bar renders, Then the side button offers to share the result', () => {
    renderBar(vi.fn().mockResolvedValue('shared'), true);
    expect(screen.getByTestId('quick-results-challenge')).toHaveAccessibleName('quickPlay.solo.shareResult');
  });

  it('Given a signed-in player, When the bar renders, Then the side button is the same-board challenge', () => {
    renderBar(vi.fn().mockResolvedValue('shared'));
    expect(screen.getByTestId('quick-results-challenge')).toHaveAccessibleName('quickPlay.solo.challengeFriend');
  });

  it('Given the result was copied, When the share settles, Then a Copied note shows and then clears', async () => {
    vi.useFakeTimers();
    renderBar(vi.fn().mockResolvedValue('copied'), true);
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-results-challenge'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('quickPlay.solo.copied');
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('');
    vi.useRealTimers();
  });

  it('Given sharing failed, When the share settles, Then the player is told instead of nothing happening', async () => {
    renderBar(vi.fn().mockResolvedValue('failed'), true);
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-results-challenge'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('quickPlay.solo.shareFailed');
  });

  it('Given the native sheet shared it, When the share settles, Then no note is shown', async () => {
    renderBar(vi.fn().mockResolvedValue('shared'), true);
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-results-challenge'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('keeps Next board as the only filled button', () => {
    renderBar(vi.fn().mockResolvedValue('shared'), true);
    expect(screen.getByTestId('quick-results-next').className).toContain('bg-neo-lime');
    expect(screen.getByTestId('quick-results-challenge').className).not.toMatch(/\bbg-neo-/);
  });
});
