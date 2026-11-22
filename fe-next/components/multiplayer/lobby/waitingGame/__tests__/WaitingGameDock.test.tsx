import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { WaitingGameDock } from '../WaitingGameDock';
import { ROUND_MS, spawnDelay } from '../bubblePopLogic';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${Object.values(params).join(',')}` : key);

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
}

const openAndGo = () => {
  fireEvent.click(screen.getByTestId('waiting-game-chip'));
  fireEvent.click(screen.getByTestId('bubble-go'));
};

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('WaitingGameDock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    setHidden(false);
    vi.useRealTimers();
  });

  it('Given the lobby, Then the game waits behind an opt-in chip', () => {
    render(<WaitingGameDock t={t} />);
    expect(screen.getByTestId('waiting-game-chip')).toHaveTextContent('lobby.fun.play');
    expect(screen.queryByTestId('bubble-arena')).toBeNull();
  });

  it('Given a running round, When a bubble is tapped, Then it scores', () => {
    render(<WaitingGameDock t={t} />);
    openAndGo();
    tick(spawnDelay(0));
    const bubble = screen.getAllByTestId('bubble')[0];
    fireEvent.pointerDown(bubble);
    expect(screen.getByTestId('bubble-score')).toHaveTextContent(/^[15]$/);
  });

  it('Given the tab is hidden, Then the round pauses: no spawns and the clock holds', () => {
    render(<WaitingGameDock t={t} />);
    openAndGo();
    setHidden(true);
    expect(screen.getByTestId('bubble-arena')).toHaveAttribute('data-paused', 'true');
    tick(5000);
    expect(screen.queryAllByTestId('bubble')).toHaveLength(0);
    expect(screen.getByTestId('bubble-clock')).toHaveTextContent(String(ROUND_MS / 1000));
    setHidden(false);
    tick(spawnDelay(0));
    expect(screen.getAllByTestId('bubble').length).toBeGreaterThan(0);
  });

  it('Given a round is running, When the game starts and the lobby unmounts, Then every timer and listener stops', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    function Lobby() {
      const [started, setStarted] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setStarted(true)}>start</button>
          {!started && <WaitingGameDock t={t} />}
        </>
      );
    }
    render(<Lobby />);
    openAndGo();
    tick(1000);
    fireEvent.click(screen.getByText('start'));
    expect(screen.queryByTestId('bubble-arena')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('Given a scoring round ends, Then the best score persists and shows on the chip', () => {
    render(<WaitingGameDock t={t} />);
    openAndGo();
    tick(spawnDelay(0));
    fireEvent.pointerDown(screen.getAllByTestId('bubble')[0]);
    tick(ROUND_MS);
    expect(screen.getByTestId('bubble-new-best')).toBeInTheDocument();
    expect(Number(localStorage.getItem('lexiclash.lobbyBubbleBest'))).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('bubble-close'));
    expect(screen.getByTestId('waiting-game-chip')).toHaveTextContent('lobby.fun.best');
  });

  it('Given reduced motion, Then bubbles sit still and never escape', () => {
    const mm = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...mm(q), matches: q.includes('reduce') })) as typeof window.matchMedia;
    try {
      render(<WaitingGameDock t={t} />);
      openAndGo();
      tick(3000);
      const bubbles = screen.getAllByTestId('bubble');
      expect(bubbles.length).toBeGreaterThan(0);
      expect(bubbles.length).toBeLessThanOrEqual(4);
      expect(screen.getByTestId('bubble-arena')).toHaveAttribute('data-static', 'true');
    } finally {
      window.matchMedia = mm;
    }
  });
});
