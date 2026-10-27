import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import BridgeFinishBeat, { FINISH_BEAT_MS, useFinishBeat } from '../BridgeFinishBeat';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }));

const planks = [
  { word: 'FISH', solved: true },
  { word: 'BALL', solved: false },
  { word: 'CAP', solved: true },
];

describe('BridgeFinishBeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduced.value = false;
  });
  afterEach(() => vi.useRealTimers());

  it('Given a finished run, When the beat plays, Then every plank and the top word are on screen at once (no blank frame)', () => {
    render(<BridgeFinishBeat planks={planks} top={{ word: 'STONE', solved: true }} headline="Pyramid complete!" onDone={vi.fn()} />);
    expect(screen.getAllByTestId('finish-plank').map((p) => p.textContent)).toEqual(['FISH', 'BALL', 'CAP']);
    expect(screen.getByTestId('finish-top').textContent).toBe('STONE');
    expect(screen.getByText('Pyramid complete!')).toBeTruthy();
  });

  it('Given the beat, When ~800ms pass, Then it hands over to the results by itself', () => {
    const onDone = vi.fn();
    render(<BridgeFinishBeat planks={planks} headline="Done" onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(FINISH_BEAT_MS - 50); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(100); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Given the beat, When the player taps, Then it skips straight to the results', () => {
    const onDone = vi.fn();
    render(<BridgeFinishBeat planks={planks} headline="Done" onDone={onDone} />);
    fireEvent.click(screen.getByTestId('bridge-finish-beat'));
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(FINISH_BEAT_MS * 2); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Given a fresh finish, Then the beat shows until done; given a revisit or reduced motion, Then it never shows', () => {
    const fresh = renderHook(() => useFinishBeat(true));
    expect(fresh.result.current.showing).toBe(true);
    act(() => fresh.result.current.done());
    expect(fresh.result.current.showing).toBe(false);

    expect(renderHook(() => useFinishBeat(false)).result.current.showing).toBe(false);
    reduced.value = true;
    expect(renderHook(() => useFinishBeat(true)).result.current.showing).toBe(false);
  });
});
