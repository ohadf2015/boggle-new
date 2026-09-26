/**
 * MpCountdownStage — the solid-navy 3-2-1-GO stage: mode badge + one-line rule,
 * a 40vh numeral that punches once per step, board hidden behind an opaque,
 * statically-appearing layer that sits above the global FABs.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

const { mode, reduce } = vi.hoisted(() => ({ mode: { value: 'blast' as string | null }, reduce: { value: false } }));
vi.mock('@/hooks/gameState/selectors', () => ({ useGameMode: () => mode.value }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => reduce.value }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playCountdownBeep: vi.fn() }) }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));
vi.mock('@/components/Avatar', () => ({ default: ({ userId }: { userId: string }) => <i data-testid="countdown-avatar" data-user={userId} /> }));

import { MpCountdownStage, __resetCountdownDupGuard, GO_HOLD_MS } from '../MpCountdownStage';

const t = (k: string) => k;
/** One act per second: each step's timer is scheduled by the previous render's effect. */
const step = (n: number) => {
  for (let i = 0; i < n; i++) act(() => { vi.advanceTimersByTime(1000); });
};

describe('MpCountdownStage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetCountdownDupGuard();
    mode.value = 'blast';
    reduce.value = false;
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetCountdownDupGuard();
  });

  it('is a solid navy full-screen stage that hides the board and covers the global FABs', () => {
    render(<MpCountdownStage t={t} />);
    const root = screen.getByTestId('mp-countdown');
    expect(root.className).toContain('fixed inset-0');
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toMatch(/bg-neo-navy\/\d+/);
    // Above the global mute FAB (z-70) AND the toaster (z-9999): nothing peeks over the stage.
    expect(root.className).toContain('z-[10000]');
    // Appears statically — no opacity tween on the full-screen layer.
    expect(root.className).not.toContain('transition-opacity');
    expect(root.style.opacity).toBe('');
  });

  it('shows the mode badge and its one-line rule (moved here from the in-round screen)', () => {
    render(<MpCountdownStage t={t} />);
    expect(screen.getByTestId('mp-countdown-mode')).toHaveTextContent('mpUi.round.mode.blast.name');
    expect(screen.getByTestId('mp-countdown-rule')).toHaveTextContent('mpUi.round.mode.blast.rule');
    expect(screen.getByTestId('mp-countdown')).toHaveAttribute('data-mode', 'blast');
  });

  it('word-hunt carries the "any word heals" rule on the countdown', () => {
    mode.value = 'word-hunt';
    render(<MpCountdownStage t={t} />);
    expect(screen.getByTestId('mp-countdown-rule')).toHaveTextContent('mpUi.round.mode.wordHunt.rule');
  });

  it('punches each numeral once (re-keyed per step) and shows a lime GO', () => {
    render(<MpCountdownStage t={t} />);
    const three = screen.getByTestId('mp-countdown-numeral');
    expect(three).toHaveTextContent('3');
    expect(three.className).toContain('countPunch');
    expect(three.className).toContain('text-[40vh]');
    act(() => { vi.advanceTimersByTime(1000); });
    const two = screen.getByTestId('mp-countdown-numeral');
    expect(two).toHaveTextContent('2');
    expect(two).not.toBe(three);
    step(2);
    expect(screen.getByTestId('mp-countdown-numeral')).toHaveTextContent('GO!');
    expect(screen.getByTestId('mp-countdown-numeral').className).toContain('text-neo-lime');
  });

  it('reduced motion: the number changes with no punch', () => {
    reduce.value = true;
    render(<MpCountdownStage t={t} />);
    expect(screen.getByTestId('mp-countdown-numeral').className).not.toContain('countPunch');
  });

  it('reveals the round shortly after GO and unmounts', () => {
    const onComplete = vi.fn();
    render(<MpCountdownStage t={t} onComplete={onComplete} />);
    step(3);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(GO_HOLD_MS); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('mp-countdown')).toBeNull();
  });

  it('shows a "+N" chip when more players are seated than the avatar row holds', () => {
    render(
      <MpCountdownStage
        t={t}
        players={[{ username: 'a' }, { username: 'b' }, { username: 'c' }, { username: 'd' }, { username: 'e' }, { username: 'f' }, { username: 'g', isBot: true }]}
      />,
    );
    expect(screen.getAllByTestId('countdown-avatar')).toHaveLength(5);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
