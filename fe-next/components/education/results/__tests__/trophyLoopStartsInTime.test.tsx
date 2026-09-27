/**
 * The trophy has to be MOVING while the room is looking at it.
 *
 * Measured live on a cold browser profile (room XPQYVT, 2026-09-12 00:02): the
 * staged reveal ran third → second → winner → sweep → done in 4.35s and the
 * mascot video was still `paused` for every one of those frames — the original
 * loop is 662KB at 640×640 and had not buffered yet. The poster still painted a
 * trophy, so nothing looked broken, but the celebration was a photograph.
 *
 * A 4.4-second reveal is the whole budget. The loop the projector fetches has
 * to fit inside it on a first visit, so this pins BOTH halves: the component
 * points at the light encode, and the light encode stays light.
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { statSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));

vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

import { WinnerSpotlight } from '../WinnerSpotlight';

const t = (key: string) => key;
const publicDir = join(__dirname, '../../../../public');

afterEach(cleanup);

describe('the winner mascot loop', () => {
  it('plays a file small enough to start inside the reveal', () => {
    render(<WinnerSpotlight winner={{ username: 'Noa', score: 653 }} active t={t} />);
    const src = screen.getByTestId('winner-mascot-video').getAttribute('src')!;
    const bytes = statSync(join(publicDir, src)).size;
    // 150KB over localhost or a school's wifi is a fraction of a second; the
    // 662KB original was not buffered after four.
    expect(bytes).toBeLessThan(150_000);
  });

  it('keeps a painted trophy under it, so a cold frame is never an empty box', () => {
    render(<WinnerSpotlight winner={{ username: 'Noa', score: 653 }} active t={t} />);
    const poster = screen.getByTestId('winner-mascot-video').getAttribute('poster')!;
    expect(() => statSync(join(publicDir, poster))).not.toThrow();
  });
});
