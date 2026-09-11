/**
 * Every control on the round-end screens has to LOOK like a control.
 *
 * The root cause, verified: `cn()`'s tailwind-merge config files the WIDTH
 * utilities (`border-neo`, `border-neo-thick`) into the same class group as the
 * COLOUR utilities (`border-neo-black`, `border-neo-pink`…), so
 * `twMerge('border-neo border-neo-black') === 'border-neo-black'` — the width
 * is silently dropped, Tailwind preflight's `border-width: 0` wins, and the
 * button renders with no border at all. On a navy results screen that is the
 * difference between a podium of solid objects and a set of coloured smudges.
 *
 * So nothing on these screens may lean on `border-neo` surviving a merge: a
 * neo border COLOUR must always be written next to a literal width. This test
 * walks the rendered DOM rather than reading source, because the bug only
 * exists after the merge runs.
 */

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

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

import { ResultsPodium } from '../ResultsPodium';
import { WinnerSpotlight } from '../WinnerSpotlight';
import { WordCoverageGlance } from '../WordCoverageGlance';
import { StudentRoundOutcome } from '../StudentRoundOutcome';
import { ClassroomTvResults } from '../ClassroomTvResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['l1'],
  totalWords: 4,
  classFoundCount: 4,
  coverage: [
    { word: 'atlas', foundBy: ['Maya'] },
    { word: 'basalt', foundBy: ['Noa'] },
    { word: 'crater', foundBy: ['Maya'] },
    { word: 'delta', foundBy: ['Omri'] },
  ],
  missedWords: [],
  masteryByPlayer: { Maya: { found: 3, total: 4 } },
  podium: [
    { username: 'Maya', score: 140, rank: 1 },
    { username: 'Noa', score: 110, rank: 2 },
    { username: 'Omri', score: 80, rank: 3 },
  ],
};

/** A literal Tailwind border-width token: `border`, `border-2`, `border-[3px]`. */
const WIDTH = /(?:^|\s)border(?:-(?:\d+|\[\d+(?:\.\d+)?px\]))?(?=\s|$)/;
/** Any neo border COLOUR utility — the half that survives the merge. */
const NEO_COLOUR = /(?:^|\s)border-neo-(?!thick\b)[a-z]+(?:\/\d+)?(?=\s|$)/;

function borderlessControls(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[class]'))
    .map((el) => el.getAttribute('class') ?? '')
    .filter((cls) => NEO_COLOUR.test(cls) && !WIDTH.test(cls));
}

describe('round-end surfaces never rely on border-neo surviving cn()', () => {
  afterEach(cleanup);

  it('paints an explicit border width on every podium plinth and placard', () => {
    const { container } = render(
      <ResultsPodium
        entries={[
          { username: 'Maya', score: 140, rank: 1 },
          { username: 'Noa', score: 110, rank: 2 },
        ]}
        t={t}
      />
    );
    expect(borderlessControls(container)).toEqual([]);
  });

  it('paints an explicit border width on the winner spotlight', () => {
    const { container } = render(
      <WinnerSpotlight winner={{ username: 'Maya', score: 140 }} active t={t} />
    );
    expect(borderlessControls(container)).toEqual([]);
  });

  it('paints an explicit border width on the coverage meter and its chips', () => {
    const { container } = render(
      <WordCoverageGlance
        summary={summary}
        username=""
        isTeacher
        neverPlaced={new Set()}
        t={t}
      />
    );
    expect(borderlessControls(container)).toEqual([]);
  });

  it('paints an explicit border width on the student momentum chips', () => {
    const { container } = render(
      <StudentRoundOutcome
        username="Maya"
        standings={[
          { username: 'Noa', score: 180 },
          { username: 'Maya', score: 140 },
        ]}
        mastery={{ found: 3, total: 4 }}
        momentum={{ roundNumber: 3, delta: 40, rankDelta: 1, personalBest: true }}
        t={t}
      />
    );
    expect(borderlessControls(container)).toEqual([]);
  });

  it('paints an explicit border width on the projector rematch button', () => {
    const { container } = render(
      <ClassroomTvResults summary={summary} onRematch={() => {}} t={t} />
    );
    expect(borderlessControls(container)).toEqual([]);
  });
});
