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
import { _resetGagSession } from '../useGagDirector';
import { emitMascotEvent, _resetMascotBus } from '@/lib/blast/mascotBus';
import { IDLE_PEEK_MS } from '@/lib/mascot/idle';
import { SIGNATURE_CRY } from '@/lib/mascot/voice';
import { GAG_HISTORY_KEY } from '@/lib/mascot/gagHistory';
import { createGagHistory } from '@/lib/mascot/gagDirector';

const word = (len: number, w?: string) =>
  act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: len, gemLetterUsed: false, word: w }));
const reject = () => act(() => emitMascotEvent({ kind: 'word-rejected' }));
const gagCalls = () => trackGrowthEvent.mock.calls.filter((c) => c[0] === 'mascot_gag_shown');
const gagId = () => screen.queryByTestId('mascot-gag')?.getAttribute('data-gag') ?? null;
const Full = (p: Partial<React.ComponentProps<typeof GameMascotReactions>>) => (
  <GameMascotReactions mode="singleplayer" comboLevel={0} personality="full" language="en" {...p} />
);

describe('GameMascotReactions personality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetMascotBus();
    _resetGagSession();
    trackGrowthEvent.mockClear();
    playSound.mockClear();
    perf.isLowEnd = false;
    reducedMotion.value = false;
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('voice', () => {
    it('lets out the signature cry on a long word in a solo game', () => {
      render(<Full seed={1} />);
      act(() => emitMascotEvent({ kind: 'cascade-detected', chainDepth: 3 }));
      expect(playSound).toHaveBeenCalledWith(SIGNATURE_CRY.sound, expect.objectContaining({ rate: SIGNATURE_CRY.rate }));
    });

    it('stays silent in a quiet (multiplayer/classroom) game', () => {
      render(<GameMascotReactions mode="classic" comboLevel={0} personality="quiet" />);
      word(7);
      expect(screen.getByTestId('blast-mascot-hud')).toBeTruthy();
      expect(playSound).not.toHaveBeenCalled();
    });
  });

  describe('gags', () => {
    it('caught tracing the board after 20s idle, gone on the next word', () => {
      render(<Full />);
      act(() => vi.advanceTimersByTime(IDLE_PEEK_MS - 1000));
      expect(gagId()).toBeNull();
      act(() => vi.advanceTimersByTime(2000));
      expect(gagId()).toBe('caught-tracing');
      expect(screen.getByTestId('mascot-gag').closest('[aria-hidden="true"]')!.className).toContain('pointer-events-none');
      act(() => vi.advanceTimersByTime(10_000));
      expect(gagId()).toBe('caught-tracing');
      word(5);
      expect(gagId()).toBeNull();
    });

    it('the third rejection in a round opens the dictionary on its head', () => {
      render(<Full />);
      reject();
      reject();
      act(() => vi.advanceTimersByTime(10_000));
      reject();
      expect(gagId()).toBe('dictionary-bonk');
      expect(gagCalls().at(-1)?.[1]).toMatchObject({ gag: 'dictionary-bonk', mode: 'singleplayer' });
    });

    it('holds back the timer in the last 10 seconds', () => {
      const { rerender } = render(<Full remainingTime={11} />);
      rerender(<Full remainingTime={10} />);
      expect(gagId()).toBe('holds-back-timer');
    });

    it('comes back dusty after days away, but not on a first visit', () => {
      const { unmount } = render(<Full />);
      expect(gagId()).toBeNull();
      unmount();
      const h = { ...createGagHistory(), lastPlayedAt: Date.now() - 4 * 86_400_000 };
      localStorage.setItem(GAG_HISTORY_KEY, JSON.stringify(h));
      render(<Full />);
      expect(gagId()).toBe('dusty-practising');
    });

    it('hides the HUD pop while a gag plays so two mascots never show', () => {
      render(<Full />);
      reject();
      reject();
      act(() => vi.advanceTimersByTime(10_000));
      reject();
      word(7);
      expect(gagId()).toBe('dictionary-bonk');
      expect(screen.queryByTestId('blast-mascot-hud')).toBeNull();
    });

    it('skips gags on a low-end device, under reduced motion, and in quiet games', () => {
      perf.isLowEnd = true;
      const a = render(<Full remainingTime={10} />);
      expect(gagId()).toBeNull();
      a.unmount();
      perf.isLowEnd = false;
      reducedMotion.value = true;
      const b = render(<Full remainingTime={10} />);
      expect(gagId()).toBeNull();
      b.unmount();
      reducedMotion.value = false;
      render(<GameMascotReactions mode="classic" comboLevel={0} personality="quiet" remainingTime={10} />);
      act(() => vi.advanceTimersByTime(IDLE_PEEK_MS + 2000));
      expect(gagId()).toBeNull();
    });
  });

  describe('combo', () => {
    it('stacks a tile per combo step, goes unhinged, then collapses when it breaks', () => {
      const { rerender } = render(<Full comboLevel={6} />);
      rerender(<Full comboLevel={7} />);
      expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-state')).toBe('unhinged');
      expect(screen.getByTestId('mascot-escalation').getAttribute('data-tier')).toBe('3');
      expect(screen.getByTestId('mascot-tile-stack').getAttribute('data-tiles')).toBe('5');
      rerender(<Full comboLevel={0} />);
      const collapsed = gagId() === 'stack-collapse' || screen.getByTestId('blast-mascot-hud').getAttribute('data-state') === 'exhausted';
      expect(collapsed).toBe(true);
    });
  });

  describe('clips', () => {
    const thirdRejection = () => {
      reject();
      reject();
      act(() => vi.advanceTimersByTime(10_000));
      reject();
    };

    it('plays the manifest clip once it is published, restarting it each time', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => [{ id: 'bonk-dizzy', file: 'bonk-dizzy.webp', poster: 'p.webp', durationMs: 2800, loop: false, beats: { windupMs: 500, actionMs: 150, holdMs: 600 }, tags: [] }],
      })));
      render(<Full />);
      await act(async () => {});
      thirdRejection();
      expect(screen.getByTestId('mascot-gag').querySelector('img')!.getAttribute('src')).toMatch(/^\/mascot\/anim\/bonk-dizzy\.webp\?t=\d+$/);
    });

    it('falls back to the plain poses while the clip is missing', async () => {
      render(<Full />);
      await act(async () => {});
      thirdRejection();
      expect(screen.getByTestId('mascot-gag').querySelector('img')!.getAttribute('src')).toMatch(/-nobg\.webp$/);
    });
  });
});
