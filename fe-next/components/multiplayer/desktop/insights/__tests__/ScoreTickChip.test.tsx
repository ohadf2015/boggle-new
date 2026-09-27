import { renderHook, act, render, screen } from '@testing-library/react';
import { useScoreTickQueue, ScoreTickChip } from '../ScoreTickChip';
import type { RosterPlayer } from '../../RosterRail';

const p = (uid: string, score: number): RosterPlayer => ({
  userId: uid, username: uid, score, status: 'connected',
});

describe('ScoreTickChip', () => {
  it('renders +delta with mode color border', () => {
    render(<ScoreTickChip delta={12} mode="blast" />);
    const el = screen.getByTestId('score-tick-chip');
    expect(el.textContent).toBe('+12');
    expect(el.className).toMatch(/border-neo-lime/);
  });
});

describe('useScoreTickQueue', () => {
  it('produces no ticks on first observation', () => {
    const lb = [p('u1', 0)];
    const { result } = renderHook(({ lb }) => useScoreTickQueue(lb), {
      initialProps: { lb },
    });
    expect(result.current.ticksByUserId.size).toBe(0);
  });

  it('queues a tick when a score increases between renders', () => {
    const { result, rerender } = renderHook(({ lb }: { lb: RosterPlayer[] }) => useScoreTickQueue(lb), {
      initialProps: { lb: [p('u1', 5)] },
    });
    act(() => {
      rerender({ lb: [p('u1', 12)] });
    });
    const arr = result.current.ticksByUserId.get('u1');
    expect(arr).toBeDefined();
    expect(arr?.[arr.length - 1].delta).toBe(7);
  });

  it('does not queue when score stays equal', () => {
    const { result, rerender } = renderHook(({ lb }: { lb: RosterPlayer[] }) => useScoreTickQueue(lb), {
      initialProps: { lb: [p('u1', 5)] },
    });
    act(() => {
      rerender({ lb: [p('u1', 5)] });
    });
    expect(result.current.ticksByUserId.get('u1')).toBeUndefined();
  });
});
