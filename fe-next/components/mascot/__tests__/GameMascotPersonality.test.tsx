import React from 'react';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const { trackGrowthEvent, playSound, perf, reducedMotion } = vi.hoisted(() => ({
  trackGrowthEvent: vi.fn(),
  playSound: vi.fn(),
  perf: { isLowEnd: false },
  reducedMotion: { value: false },
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMotion.value, default: () => reducedMotion.value }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => perf }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound }) }));

import { GameMascotReactions } from '../GameMascotReactions';
import { emitMascotEvent, _resetMascotBus } from '@/lib/blast/mascotBus';
import { IDLE_PEEK_MS, IDLE_DOZE_MS } from '@/lib/mascot/idle';
import { SIGNATURE_CRY } from '@/lib/mascot/voice';
import { LEGENDARY_GAGS, rollLegendaryRound } from '@/lib/mascot/legendary';
import { createSeededRng } from '@/lib/mascot/rng';

const word = (len: number) => act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: len, gemLetterUsed: false }));
const gagCalls = () => trackGrowthEvent.mock.calls.filter((c) => c[0] === 'mascot_gag_shown');

describe('GameMascotReactions personality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetMascotBus();
    trackGrowthEvent.mockClear();
    playSound.mockClear();
    perf.isLowEnd = false;
    reducedMotion.value = false;
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  describe('voice', () => {
    it('lets out the signature cry on a long word in a solo game', () => {
      render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" />);
      word(7);
      expect(playSound).toHaveBeenCalledWith(SIGNATURE_CRY.sound, expect.objectContaining({ rate: SIGNATURE_CRY.rate }));
    });

    it('stays silent in a quiet (multiplayer/classroom) game', () => {
      render(<GameMascotReactions mode="classic" comboLevel={0} personality="quiet" />);
      word(7);
      expect(screen.getByTestId('blast-mascot-hud')).toBeTruthy();
      expect(playSound).not.toHaveBeenCalled();
    });
  });

  describe('idle doze', () => {
    it('peeks in after 20s with no word, dozes, and leaves on the next word', () => {
      render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" />);
      act(() => vi.advanceTimersByTime(IDLE_PEEK_MS - 1000));
      expect(screen.queryByTestId('mascot-idle')).toBeNull();
      act(() => vi.advanceTimersByTime(1500));
      expect(screen.getByTestId('mascot-idle').getAttribute('data-phase')).toBe('peek');
      act(() => vi.advanceTimersByTime(IDLE_DOZE_MS - IDLE_PEEK_MS + 1000));
      expect(screen.getByTestId('mascot-idle').getAttribute('data-phase')).toBe('doze');
      expect(gagCalls()).toEqual([['mascot_gag_shown', { gag: 'idle-doze', mode: 'singleplayer' }]]);
      word(3);
      expect(screen.queryByTestId('mascot-idle')).toBeNull();
    });

    it('a short word also counts as activity', () => {
      render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" />);
      act(() => vi.advanceTimersByTime(IDLE_PEEK_MS - 2000));
      word(3);
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.queryByTestId('mascot-idle')).toBeNull();
    });

    it('never dozes in a quiet game', () => {
      render(<GameMascotReactions mode="classic" comboLevel={0} personality="quiet" />);
      act(() => vi.advanceTimersByTime(IDLE_DOZE_MS + 5000));
      expect(screen.queryByTestId('mascot-idle')).toBeNull();
    });
  });

  describe('legendary gag', () => {
    it('plays once in a lucky round, then never again', () => {
      render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" seed={3} legendaryChance={1} />);
      for (let i = 0; i < 8; i++) word(7);
      const gag = screen.getByTestId('mascot-legendary');
      expect(gag.getAttribute('aria-hidden')).toBe('true');
      expect(gag.className).toContain('pointer-events-none');
      expect(gagCalls()).toHaveLength(1);
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.queryByTestId('mascot-legendary')).toBeNull();
      for (let i = 0; i < 8; i++) word(7);
      expect(screen.queryByTestId('mascot-legendary')).toBeNull();
      expect(gagCalls()).toHaveLength(1);
    });

    it('skips the gag on a low-end device', () => {
      perf.isLowEnd = true;
      render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" seed={3} legendaryChance={1} />);
      for (let i = 0; i < 8; i++) word(7);
      expect(screen.queryByTestId('mascot-legendary')).toBeNull();
    });

    it('skips the gag under reduced motion', () => {
      reducedMotion.value = true;
      render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" seed={3} legendaryChance={1} />);
      for (let i = 0; i < 8; i++) word(7);
      expect(screen.queryByTestId('mascot-legendary')).toBeNull();
    });

    it('never plays in a quiet game', () => {
      render(<GameMascotReactions mode="classic" comboLevel={0} personality="quiet" seed={3} legendaryChance={1} />);
      for (let i = 0; i < 8; i++) word(7);
      expect(screen.queryByTestId('mascot-legendary')).toBeNull();
    });
  });

  describe('combo escalation', () => {
    it('gets more unhinged with the combo, then collapses when it breaks', () => {
      const { rerender } = render(<GameMascotReactions mode="singleplayer" comboLevel={6} personality="full" />);
      rerender(<GameMascotReactions mode="singleplayer" comboLevel={7} personality="full" />);
      expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-state')).toBe('unhinged');
      expect(screen.getByTestId('mascot-escalation').getAttribute('data-tier')).toBe('3');
      rerender(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" />);
      expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-state')).toBe('exhausted');
    });
  });
});

describe('GameMascotReactions animated clips', () => {
  beforeEach(() => {
    _resetMascotBus();
    trackGrowthEvent.mockClear();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('plays the manifest clip for a gag once it is published', async () => {
    const clips = LEGENDARY_GAGS.filter((g) => g.clip).map((g) => ({
      id: g.clip, file: `${g.clip}.webp`, poster: `${g.clip}-poster.webp`, durationMs: 2000, loop: false,
      beats: { windupMs: 400, actionMs: 150, holdMs: 400 }, tags: [],
    }));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => clips })));
    const seed = [...Array(500).keys()].find((s) => rollLegendaryRound(createSeededRng(s), { chance: 1 })?.id === 'bonk')!;
    render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" seed={seed} legendaryChance={1} />);
    await act(async () => {});
    for (let i = 0; i < 4; i++) word(4);
    const gag = screen.getByTestId('mascot-legendary');
    expect(gag.getAttribute('data-gag')).toBe('bonk');
    expect(gag.querySelector('img')!.getAttribute('src')).toBe('/mascot/anim/bonk-dizzy.webp');
  });

  it('falls back to the plain poses when the manifest is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    const seed = [...Array(500).keys()].find((s) => rollLegendaryRound(createSeededRng(s), { chance: 1 })?.id === 'bonk')!;
    render(<GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" seed={seed} legendaryChance={1} />);
    await act(async () => {});
    for (let i = 0; i < 4; i++) word(4);
    expect(screen.getByTestId('mascot-legendary').querySelector('img')!.getAttribute('src')).toMatch(/-nobg\.webp$/);
  });
});
