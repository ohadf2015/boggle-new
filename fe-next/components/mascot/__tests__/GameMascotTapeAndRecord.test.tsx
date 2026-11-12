import React from 'react';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const { trackGrowthEvent, playSound, reducedMotion } = vi.hoisted(() => ({
  trackGrowthEvent: vi.fn(),
  playSound: vi.fn(),
  reducedMotion: { value: false },
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMotion.value, default: () => reducedMotion.value }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => ({ isLowEnd: false }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound }) }));

import { GameMascotReactions } from '../GameMascotReactions';
import { _resetGagSession } from '../useGagDirector';
import { emitMascotEvent, _resetMascotBus } from '@/lib/blast/mascotBus';
import { IDLE_PEEK_MS } from '@/lib/mascot/idle';
import { GAG_HISTORY_KEY } from '@/lib/mascot/gagHistory';
import { createGagHistory } from '@/lib/mascot/gagDirector';

const longWord = () => act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 8, gemLetterUsed: false }));
const gagId = () => screen.queryByTestId('mascot-gag')?.getAttribute('data-gag') ?? null;
const variantId = () => screen.queryByTestId('mascot-gag')?.getAttribute('data-variant') ?? null;
const shown = () => trackGrowthEvent.mock.calls.filter((c) => c[0] === 'mascot_gag_shown').map((c) => c[1].gag);
const played = () => playSound.mock.calls.map((c) => c[0]);
const tick = (ms: number) => {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
};
const waitOut = () => tick(9000);
type P = Partial<React.ComponentProps<typeof GameMascotReactions>>;
const Full = (p: P) => <GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" language="en" {...p} />;

describe('measuring tape and crumpled record gags', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    _resetMascotBus();
    _resetGagSession();
    trackGrowthEvent.mockClear();
    playSound.mockClear();
    reducedMotion.value = false;
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('long words in one session: finger count, then the tape with its zip, then two tapes taped together', () => {
    render(<Full />);
    longWord();
    expect(gagId()).toBe('finger-count');
    waitOut();
    longWord();
    expect([gagId(), variantId()]).toEqual(['measuring-tape', 'measures-the-word']);
    tick(800);
    expect(played()).toContain('gagTapeMeasure');
    expect(screen.getByTestId('mascot-gag-prop').getAttribute('data-prop')).toBe('tape');
    waitOut();
    longWord();
    expect(variantId()).toBe('tapes-two-together');
    waitOut();
    expect(shown()).toEqual(['finger-count', 'measuring-tape', 'measuring-tape']);
  });

  it('beating the old best mid-round runs the drumroll once, even as the score keeps climbing', () => {
    const { rerender } = render(<Full score={40} personalBest={50} />);
    rerender(<Full score={55} personalBest={50} />);
    expect(gagId()).toBe('record-overreaction');
    expect(played().some((s) => /drumroll/i.test(s))).toBe(true);
    waitOut();
    rerender(<Full score={80} personalBest={50} />);
    expect(gagId()).toBeNull();
    expect(shown()).toEqual(['record-overreaction']);
  });

  it('on the next personal-best day the mascot crumples its own record instead', () => {
    const h = { ...createGagHistory(), dailyShownOn: { 'personal-best': '2000-1-1' }, dailyLast: { 'personal-best': 'record-overreaction' } };
    localStorage.setItem(GAG_HISTORY_KEY, JSON.stringify(h));
    const { rerender } = render(<Full score={0} personalBest={50} />);
    rerender(<Full score={60} personalBest={50} />);
    expect(gagId()).toBe('crumpled-record');
    tick(1800);
    expect(played()).toContain('gagCrumple');
    expect(screen.getByTestId('mascot-gag-prop').getAttribute('data-prop')).toBe('score-sheet');
  });

  it('a personal best cuts into a gag that is still playing', () => {
    const { rerender } = render(<Full score={10} personalBest={50} />);
    act(() => vi.advanceTimersByTime(IDLE_PEEK_MS + 1000));
    expect(gagId()).toBe('caught-tracing');
    rerender(<Full score={60} personalBest={50} />);
    expect(gagId()).toBe('record-overreaction');
  });

  it('a first-ever game has no record to beat', () => {
    const { rerender } = render(<Full score={0} personalBest={null} />);
    rerender(<Full score={300} personalBest={null} />);
    expect(gagId()).toBeNull();
  });

  it('stays off in multiplayer and with reduced motion', () => {
    const quiet = render(<GameMascotReactions mode="classic" comboLevel={0} personality="quiet" score={0} personalBest={50} />);
    quiet.rerender(<GameMascotReactions mode="classic" comboLevel={0} personality="quiet" score={60} personalBest={50} />);
    expect(gagId()).toBeNull();
    quiet.unmount();
    reducedMotion.value = true;
    const { rerender } = render(<Full score={0} personalBest={50} />);
    rerender(<Full score={60} personalBest={50} />);
    expect(gagId()).toBeNull();
    expect(shown()).toEqual([]);
  });
});
