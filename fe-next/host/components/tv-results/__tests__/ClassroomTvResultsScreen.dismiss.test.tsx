/**
 * The recap has to be leaveable without a page reload.
 *
 * Captured defect (r5 notes, "Other observations"): after a round ended, a
 * click aimed at the projector lobby's "Change game" / "START GAME" failed
 * with `covered by <video>` and only a reload cleared it. The video was not
 * stuck — `ClassroomTvResultsScreen` is `fixed inset-0 z-[75]` and legitimately
 * covers the lobby (`z-[65]`), and its ONLY affordance was REMATCH, which
 * replays the same mode. A teacher who wants a different game next round had
 * no way back. `pointer-events-none` on the mascot alone would not have fixed
 * it: the click would simply have landed on the opaque navy behind it.
 *
 * So: one primary action (REMATCH, inside the recap, unchanged) plus one quiet
 * secondary that returns the room to the lobby. Not a confirmation dialog —
 * nothing is destroyed by closing a recap (decision-fatigue rules).
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

import ClassroomTvResultsScreen from '../ClassroomTvResultsScreen';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const summary: ClassroomSummary = {
  teacherName: 'Mr. Gauntlet B',
  lessonNames: ['Common English'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 2,
  coverage: [
    { word: 'photon', foundBy: ['Noa'] },
    { word: 'atom', foundBy: ['Dan'] },
    { word: 'quark', foundBy: [] },
    { word: 'boson', foundBy: [] },
  ],
  missedWords: ['quark', 'boson'],
  masteryByPlayer: { Noa: { found: 2, total: 4 }, Dan: { found: 1, total: 4 } },
  podium: [
    { username: 'Noa', score: 80, rank: 1 },
    { username: 'Dan', score: 40, rank: 2 },
  ],
};

describe('ClassroomTvResultsScreen — returning to the lobby', () => {
  afterEach(cleanup);

  it('offers a dismiss control that hands the room back to the lobby', () => {
    const onClose = vi.fn();
    render(<ClassroomTvResultsScreen summary={summary} onRematch={vi.fn()} onClose={onClose} t={t} />);
    const dismiss = screen.getByTestId('classroom-tv-dismiss');
    fireEvent.click(dismiss);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the dismiss reads as a control: a real border, not a ghost', () => {
    render(<ClassroomTvResultsScreen summary={summary} onClose={vi.fn()} t={t} />);
    const cls = screen.getByTestId('classroom-tv-dismiss').className;
    // A cream edge on navy measures 16.8:1; `border-neo` does not survive a
    // cn() merge next to a colour class, so the width is written literally.
    expect(cls).toMatch(/border-\[(2|3)px\]/);
    expect(cls).toMatch(/border-neo-cream/);
  });

  it('does not render a dismiss when the host has nowhere to go back to', () => {
    render(<ClassroomTvResultsScreen summary={summary} t={t} />);
    expect(screen.queryByTestId('classroom-tv-dismiss')).toBeNull();
  });

  it('keeps REMATCH as the one primary action', () => {
    render(<ClassroomTvResultsScreen summary={summary} onRematch={vi.fn()} onClose={vi.fn()} t={t} />);
    expect(screen.getByTestId('classroom-tv-rematch')).toBeInTheDocument();
  });

  it('TvResultsView threads its own onClose into the classroom branch', () => {
    const source = readFileSync(resolve(__dirname, '../TvResultsView.tsx'), 'utf8');
    const branch = source.match(/<ClassroomTvResultsScreen[\s\S]*?\/>/);
    expect(branch).not.toBeNull();
    expect(branch![0]).toMatch(/onClose=\{onClose\}/);
  });
});
