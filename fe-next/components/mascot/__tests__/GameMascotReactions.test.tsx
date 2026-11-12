import React from 'react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const { trackGrowthEvent, reduced } = vi.hoisted(() => ({
  trackGrowthEvent: vi.fn(),
  reduced: { value: false },
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [reduced.value, vi.fn()] }));

import { GameMascotReactions } from '../GameMascotReactions';
import { emitMascotEvent, _resetMascotBus } from '@/lib/blast/mascotBus';

describe('GameMascotReactions', () => {
  beforeEach(() => {
    _resetMascotBus();
    trackGrowthEvent.mockClear();
    reduced.value = false;
    localStorage.clear();
  });

  it('stays hidden until something happens', () => {
    render(<GameMascotReactions mode="classic" comboLevel={0} />);
    expect(screen.queryByTestId('blast-mascot-hud')).toBeNull();
  });

  it('pops in on a long word and records the reaction once', () => {
    render(<GameMascotReactions mode="classic" comboLevel={0} />);
    act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 6, gemLetterUsed: false }));
    expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-state')).toBe('wow');
    expect(trackGrowthEvent).toHaveBeenCalledWith('mascot_reaction_shown', { state: 'wow', mode: 'classic' });
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
  });

  it('dances when the combo reaches 5', () => {
    const { rerender } = render(<GameMascotReactions mode="classic" comboLevel={4} />);
    rerender(<GameMascotReactions mode="classic" comboLevel={5} />);
    expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-state')).toBe('dancing');
  });

  it('shows nothing when the player turned effects down', () => {
    reduced.value = true;
    render(<GameMascotReactions mode="classic" comboLevel={0} />);
    act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 7, gemLetterUsed: false }));
    expect(screen.queryByTestId('blast-mascot-hud')).toBeNull();
  });

  it('a host can move the mascot to its own slot instead of the default corner', () => {
    render(<GameMascotReactions mode="crossword" comboLevel={0} slotClassName="bottom-4 start-2" />);
    act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 6, gemLetterUsed: false }));
    const slot = screen.getByTestId('game-mascot-slot');
    expect(slot.className).toContain('bottom-4 start-2');
    expect(slot.className).not.toContain('end-[4.25rem]');
    expect(slot.className).not.toContain('sm:top-3');
    expect(slot.className).toContain('pointer-events-none');
  });
});
