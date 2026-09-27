import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Sound on' }),
}));

import { V2Results } from '../V2Results';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const results = (over: Partial<Parameters<typeof V2Results>[0]> = {}) => (
  <V2Results
    t={t}
    peakM={12}
    score={900}
    bestM={12}
    isBest
    run={createRun(1)}
    badges={[]}
    unlocked={new Set<string>()}
    onRestart={() => {}}
    onHome={() => {}}
    onClose={() => {}}
    {...over}
  />
);

describe('V2Results — getting out of the modal', () => {
  it('given sharing is offered, then the icon-only share button has an accessible name and shares', () => {
    const onShare = vi.fn();
    render(results({ onShare }));

    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.wreck.share' }));
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('given the run is over, when rendered, then there is a way home', () => {
    const onHome = vi.fn();
    render(results({ onHome }));

    fireEvent.click(screen.getByLabelText('wordTowerV2.results.home'));
    expect(onHome).toHaveBeenCalledOnce();
  });

  it('given the run is over, when the close control is tapped, then the modal dismisses', () => {
    const onClose = vi.fn();
    render(results({ onClose }));

    fireEvent.click(screen.getByLabelText('wordTowerV2.results.close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('given the run is over, when Escape is pressed, then the modal dismisses', () => {
    const onClose = vi.fn();
    render(results({ onClose }));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('given the backdrop is tapped, then the modal dismisses', () => {
    const onClose = vi.fn();
    const { container } = render(results({ onClose }));

    fireEvent.click(container.querySelector('[data-wt2-results-backdrop]')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('given no smash target and too few words to share, then neither dead CTA is rendered', () => {
    render(results());

    expect(screen.queryByText('wordTowerV2.wreck.share')).toBeNull();
    expect(screen.queryByText(/smash/i)).toBeNull();
    // The one action that always works is still there.
    expect(screen.getByText('common.playAgain')).toBeTruthy();
  });

  it('given a scroller click outside the card, then the modal dismisses', () => {
    const onClose = vi.fn();
    const { container } = render(results({ onClose }));

    const scroller = container.querySelector('[data-wt2-results-scroll]');
    fireEvent.click(scroller!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('given a card content click, then the modal does not dismiss', () => {
    const onClose = vi.fn();
    render(results({ onClose }));

    fireEvent.click(screen.getByText('wordTowerV2.collapsed'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('given the play again button is clicked, then onRestart fires but not onClose', () => {
    const onClose = vi.fn();
    const onRestart = vi.fn();
    render(results({ onClose, onRestart }));

    fireEvent.click(screen.getByText('common.playAgain'));
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('given the home button is clicked, then onHome fires but not onClose', () => {
    const onClose = vi.fn();
    const onHome = vi.fn();
    render(results({ onClose, onHome }));

    fireEvent.click(screen.getByLabelText('wordTowerV2.results.home'));
    expect(onHome).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('given the sticky actions bar, then it has proper structure (shrink-0, pb-safe, last child)', () => {
    const { container } = render(results());

    const backdrop = container.querySelector('[data-wt2-results-backdrop]');
    const actionsBar = container.querySelector('[data-wt2-results-actions]');
    const scroller = container.querySelector('[data-wt2-results-scroll]');

    // Actions bar is the last child of backdrop
    expect(backdrop?.lastElementChild).toBe(actionsBar);

    // Scroller is flex-1 min-h-0 overflow-y-auto
    expect(scroller).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto');

    // Actions bar has shrink-0 and pb class with env(safe-area-inset-bottom)
    expect(actionsBar).toHaveClass('shrink-0');
    const pbClass = Array.from(actionsBar!.classList).find((c) => c.startsWith('pb-'));
    expect(pbClass).toBeTruthy();
    expect(actionsBar?.className).toMatch(/pb-\[/);

    // Play again and Home buttons are inside actions bar, not in scroller
    const playAgainBtn = screen.getByText('common.playAgain');
    const homeBtn = screen.getByLabelText('wordTowerV2.results.home');
    expect(actionsBar?.contains(playAgainBtn)).toBe(true);
    expect(actionsBar?.contains(homeBtn)).toBe(true);
    expect(scroller?.contains(playAgainBtn)).toBe(false);
    expect(scroller?.contains(homeBtn)).toBe(false);
  });

  it('given dailyLocked is true, then home button is in actions bar but play again is not', () => {
    const { container } = render(results({ dailyLocked: true }));

    const actionsBar = container.querySelector('[data-wt2-results-actions]');
    const homeBtn = screen.getByLabelText('wordTowerV2.results.home');
    const playAgainBtn = screen.queryByText('common.playAgain');

    expect(actionsBar?.contains(homeBtn)).toBe(true);
    expect(playAgainBtn).toBeNull();
  });
});
