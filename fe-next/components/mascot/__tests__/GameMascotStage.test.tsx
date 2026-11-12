import React from 'react';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false, default: () => false }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => ({ isLowEnd: false }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));

import { GameMascotReactions } from '../GameMascotReactions';
import { _resetGagSession } from '../useGagDirector';
import { emitMascotEvent, _resetMascotBus } from '@/lib/blast/mascotBus';

function sized(width: number, height: number) {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ width, height, x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, toJSON: () => ({}) });
  document.body.appendChild(el);
  return el;
}

const reject = () => act(() => emitMascotEvent({ kind: 'word-rejected' }));

describe('GameMascotReactions on a host stage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetMascotBus();
    _resetGagSession();
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('Given a roomy band, a gag plays inside it, scaled up and untouchable', () => {
    const band = sized(366, 180);
    render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" language="en" seed={1} stages={[band]} />);
    reject();
    const gag = screen.getByTestId('mascot-gag');
    expect(band.contains(gag)).toBe(true);
    expect(Number(gag.dataset.scale)).toBeGreaterThan(1.1);
    expect(gag.closest('[aria-hidden="true"]')!.className).toContain('pointer-events-none');
  });

  it('Given the band is too short, the gag falls back to the edge strip', () => {
    const band = sized(366, 20);
    render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" language="en" seed={1} stages={[band]} />);
    reject();
    expect(band.contains(screen.getByTestId('mascot-gag'))).toBe(false);
  });

  it('Given a timer anchor, the final-seconds gag plays against the timer, not in the band', () => {
    const band = sized(366, 180);
    const timer = sized(90, 44);
    render(
      <GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" language="en" seed={1} stages={[band]} timerAnchor={timer} />,
    );
    act(() => emitMascotEvent({ kind: 'timer-final-10s', secondsLeft: 10 }));
    const gag = screen.getByTestId('mascot-gag');
    expect(gag.dataset.gag).toBe('holds-back-timer');
    expect(timer.contains(gag)).toBe(true);
  });

  it('Given a band, the small reaction pop shows there instead of over the HUD', () => {
    const band = sized(366, 180);
    render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="quiet" stages={[band]} />);
    act(() => emitMascotEvent({ kind: 'combo-milestone', level: 8 }));
    expect(band.contains(screen.getByTestId('game-mascot-slot'))).toBe(true);
  });
});
