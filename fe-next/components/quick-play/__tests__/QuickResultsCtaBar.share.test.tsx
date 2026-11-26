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
  it('Given the bar renders, Then the challenge button carries a visible label and the current mode has no chip', () => {
    renderBar(vi.fn().mockResolvedValue('shared'));
    expect(screen.getByTestId('quick-results-challenge')).toHaveTextContent('quickPlay.solo.challengeShort');
    expect(screen.queryByTestId('quick-next-mode-word-hunt')).toBeNull();
    expect(screen.getByTestId('quick-next-mode-blast')).toBeTruthy();
  });

  it('Given the pinned bar, Then the other modes are a calm outline row with no caption, pressing like chunky tiles', () => {
    renderBar(vi.fn().mockResolvedValue('shared'));
    expect(screen.queryByText('quickPlay.solo.pickNextMode')).toBeNull();
    expect(screen.getByTestId('quick-next-mode-picker')).toHaveAccessibleName('quickPlay.solo.pickNextMode');
    const chip = screen.getByTestId('quick-next-mode-blast');
    expect(chip.className).toContain('bg-neo-navy-elevated');
    expect(chip.className).not.toContain('bg-neo-pink');
    fireEvent.pointerDown(chip, { button: 0 });
    expect(chip).toHaveAttribute('data-pressed', 'true');
  });

  it('Given the bar, Then NEXT BOARD and the challenge button sink with the chunky press', () => {
    renderBar(vi.fn().mockResolvedValue('shared'));
    for (const id of ['quick-results-next', 'quick-results-challenge']) {
      const el = screen.getByTestId(id);
      fireEvent.pointerDown(el, { button: 0 });
      expect(el).toHaveAttribute('data-pressed', 'true');
      expect(el.className).not.toContain('active:translate');
    }
  });

  it('Given a guest, When the bar renders, Then the side button is still a same-board challenge', () => {
    renderBar(vi.fn().mockResolvedValue('shared'), true);
    expect(screen.getByTestId('quick-results-challenge')).toHaveAccessibleName('quickPlay.solo.challengeFriend');
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
