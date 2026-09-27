/**
 * The beat after the beat.
 *
 * Blooket's end-of-game is a word ("Victory") and a character on a plinth. This
 * is the same idea turned up: the mascot actually celebrates, the room hears
 * one short sting, and confetti fires — ONCE, on the winner's reveal, never on
 * every re-render of a screen that re-renders whenever a score payload settles.
 *
 * The spotlight bar is painted at every stage, waiting or not, so the projector
 * layout never jumps when the winner lands and a screenshot never catches a
 * hole where the celebration is about to be (Pitfall Class 5).
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fireRankConfetti = vi.fn();
const cleanupConfetti = vi.fn();
const playRoundEndCue = vi.fn(() => null);

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: (...args: unknown[]) => fireRankConfetti(...args),
  cleanupConfetti: () => cleanupConfetti(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: (...args: unknown[]) => playRoundEndCue(...args),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

import { WinnerSpotlight } from '../WinnerSpotlight';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const winner = { username: 'Maya', score: 140 };

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('WinnerSpotlight', () => {
  beforeEach(() => {
    fireRankConfetti.mockClear();
    cleanupConfetti.mockClear();
    playRoundEndCue.mockClear();
    setReducedMotion(false);
  });

  afterEach(cleanup);

  it('renders nothing when the room had no winner', () => {
    const { container } = render(<WinnerSpotlight active t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('holds the bar before the winner lands, so nothing on the wall moves', () => {
    render(<WinnerSpotlight winner={winner} active={false} t={t} />);
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-active', 'false');
    expect(screen.queryByText('Maya')).not.toBeInTheDocument();
  });

  it('names the winner once the winner is revealed', () => {
    render(<WinnerSpotlight winner={winner} active t={t} />);
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText(/education\.results\.moment\.winnerBanner/)).toBeInTheDocument();
  });

  it('fires confetti and the win sting exactly once', () => {
    const { rerender } = render(<WinnerSpotlight winner={winner} active t={t} />);
    rerender(<WinnerSpotlight winner={winner} active t={t} />);
    rerender(<WinnerSpotlight winner={{ ...winner, score: 150 }} active t={t} />);
    expect(fireRankConfetti).toHaveBeenCalledTimes(1);
    expect(playRoundEndCue).toHaveBeenCalledTimes(1);
  });

  it('shows the winner without shouting when the cue belongs to someone else', () => {
    // A classmate's phone: the bar, the mascot and the name, no sting, no
    // confetti. Thirty phones firing one fanfare is noise, not a celebration.
    render(<WinnerSpotlight winner={winner} active cue={false} t={t} />);
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(fireRankConfetti).not.toHaveBeenCalled();
    expect(playRoundEndCue).not.toHaveBeenCalled();
  });

  it('celebrates nothing while the winner is still hidden', () => {
    render(<WinnerSpotlight winner={winner} active={false} t={t} />);
    expect(fireRankConfetti).not.toHaveBeenCalled();
    expect(playRoundEndCue).not.toHaveBeenCalled();
  });

  it('plays the mascot trophy loop with its poster already painted', () => {
    render(<WinnerSpotlight winner={winner} active t={t} />);
    const video = screen.getByTestId('winner-mascot-video') as HTMLVideoElement;
    expect(video.getAttribute('poster')).toBe('/mascot/teacher/badge-trophy.webp');
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
  });

  it('swaps the loop for a still under prefers-reduced-motion', () => {
    setReducedMotion(true);
    render(<WinnerSpotlight winner={winner} active t={t} />);
    expect(screen.queryByTestId('winner-mascot-video')).not.toBeInTheDocument();
    expect(screen.getByTestId('winner-mascot-still')).toHaveAttribute(
      'src',
      '/mascot/teacher/badge-trophy.webp'
    );
  });

  it('fires no confetti at all under prefers-reduced-motion', () => {
    setReducedMotion(true);
    render(<WinnerSpotlight winner={winner} active t={t} />);
    expect(fireRankConfetti).not.toHaveBeenCalled();
  });

  it('clears its confetti on unmount so a rematch starts clean', () => {
    const { unmount } = render(<WinnerSpotlight winner={winner} active t={t} />);
    unmount();
    expect(cleanupConfetti).toHaveBeenCalled();
  });

  it('never fades itself in', () => {
    const { container } = render(<WinnerSpotlight winner={winner} active t={t} />);
    expect(container.querySelectorAll('.opacity-0')).toHaveLength(0);
    expect(container.querySelectorAll('.animate-neo-pop')).toHaveLength(0);
  });
});
