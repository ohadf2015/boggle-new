/**
 * The reveal's mascot must never be an empty black box.
 *
 * Round-1 critic, verbatim: "the CHAMPION screen's mascot clip box was itself
 * empty (black box, no video/image loaded)". A bare <video> that cannot decode
 * (or is still buffering, or 404s) renders as a black rectangle and throws
 * nothing — recurring-pitfalls Class 4, a silent failure that looks identical
 * to "still loading".
 *
 * The fix is structural, not a retry: the transparent still is a real <img>
 * painted underneath at all times, and the clip only fades in over it once it
 * is actually PLAYING. Every failure mode therefore degrades to the mascot,
 * never to black. It also gives Class-5 a fully painted static resting state.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DuelRevealMascot } from '../DuelRevealMascot';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

let reducedMotion = false;
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotion,
}));

const props = {
  src: '/mascots/celebration-champion-4.mp4',
  poster: '/mascot/trophy-nobg.webp',
  label: 'education.duels.revealWin',
};

describe('DuelRevealMascot', () => {
  beforeEach(() => {
    reducedMotion = false;
  });

  it('paints the mascot still immediately, before any video decodes', () => {
    render(<DuelRevealMascot {...props} />);

    const still = screen.getByTestId('duel-reveal-still');
    expect(still.tagName).toBe('IMG');
    expect(still).toHaveAttribute('src', props.poster);
    // Still visible while the clip has not started: this is what stands in for
    // the black box.
    expect(screen.getByTestId('duel-reveal-mascot')).toHaveAttribute(
      'data-clip-state',
      'still'
    );
  });

  it('keeps the still and drops the clip when the video errors', () => {
    render(<DuelRevealMascot {...props} />);

    fireEvent.error(screen.getByTestId('duel-reveal-clip'));

    expect(screen.getByTestId('duel-reveal-still')).toBeInTheDocument();
    expect(screen.queryByTestId('duel-reveal-clip')).not.toBeInTheDocument();
    expect(screen.getByTestId('duel-reveal-mascot')).toHaveAttribute(
      'data-clip-state',
      'still'
    );
  });

  it('reveals the clip only once it is really playing', () => {
    render(<DuelRevealMascot {...props} />);

    fireEvent.playing(screen.getByTestId('duel-reveal-clip'));

    expect(screen.getByTestId('duel-reveal-mascot')).toHaveAttribute(
      'data-clip-state',
      'playing'
    );
    // The still stays mounted underneath — removing it would reintroduce the
    // black frame the moment the clip stalls mid-loop.
    expect(screen.getByTestId('duel-reveal-still')).toBeInTheDocument();
  });

  it('ships the still alone when the viewer asked for reduced motion', () => {
    reducedMotion = true;
    render(<DuelRevealMascot {...props} />);

    expect(screen.getByTestId('duel-reveal-still')).toBeInTheDocument();
    expect(screen.queryByTestId('duel-reveal-clip')).not.toBeInTheDocument();
  });

  it('never paints a bare black frame behind the mascot', () => {
    render(<DuelRevealMascot {...props} />);

    // bg-neo-navy on the frame is fine; what is forbidden is a frame whose only
    // content can be an undecodable <video>.
    expect(screen.getByTestId('duel-reveal-still')).toBeVisible();
  });
});
