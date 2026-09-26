/**
 * Blast (and any legacy-adapter mode) submits straight to the socket, so the
 * view's `foundWords` never fills: the desktop FOUND panel read "No words yet"
 * after an accepted word (pitfall class 3 — classic fills it, blast did not).
 * The frame now also lists the SERVER's accepted words (mpFeedback), once each,
 * with the server points — and an accept never re-renders the canvas.
 */
import React, { memo } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MpDesktopShellFrame } from '../MpDesktopShellFrame';
import { recordWordAccepted, resetMpFeedback } from '@/lib/multiplayer/mpFeedback';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const canvasRenders = { count: 0 };
const Canvas = memo(function Canvas() {
  canvasRenders.count += 1;
  return <div data-testid="canvas">board</div>;
});

const base = {
  canvas: <Canvas />,
  leaderboard: [{ username: 'me', score: 0 }, { username: 'bot', score: 0 }],
  socket: null,
  meId: 'me',
  roomId: 'ROOM',
  remainingTime: 45,
  totalTime: 60,
};

describe('MpDesktopShellFrame lists server-accepted words (blast)', () => {
  beforeEach(() => {
    resetMpFeedback();
    canvasRenders.count = 0;
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
  });
  afterEach(() => vi.restoreAllMocks());

  it('an accepted blast word shows in the FOUND panel with the server points, without re-rendering the board', () => {
    render(<MpDesktopShellFrame {...(base as any)} gameMode="blast" foundWords={[]} />);
    const before = canvasRenders.count;
    vi.mocked(Date.now).mockReturnValue(2_000);
    act(() => recordWordAccepted({ word: 'ores', score: 31 }));
    expect(screen.getAllByText(/ores/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/31/).length).toBeGreaterThan(0);
    expect(canvasRenders.count).toBe(before);
  });

  it('a word already in foundWords is listed once (optimistic add + server echo)', () => {
    render(
      <MpDesktopShellFrame {...(base as any)} gameMode="wheel-rush" foundWords={[{ word: 'CATS', score: 0, timestamp: 1500 }]} />,
    );
    const shown = screen.getAllByText(/^cats$/i).length;
    vi.mocked(Date.now).mockReturnValue(2_000);
    act(() => recordWordAccepted({ word: 'cats', score: 6 }));
    expect(screen.getAllByText(/^cats$/i)).toHaveLength(shown);
    // …and the server points replace the optimistic 0.
    expect(screen.getAllByText(/6/).length).toBeGreaterThan(0);
  });

  it('ignores accepts recorded before the round mounted', () => {
    act(() => recordWordAccepted({ word: 'stale', score: 9 }));
    vi.mocked(Date.now).mockReturnValue(5_000);
    render(<MpDesktopShellFrame {...(base as any)} gameMode="blast" foundWords={[]} />);
    expect(screen.queryByText(/stale/i)).toBeNull();
  });
});
