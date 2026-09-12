/**
 * The projector recap has to FIT THE WALL.
 *
 * Round 2's verdict was that nobody ever saw the celebration — the projector
 * lobby painted over it. That is fixed (`classroomResultsAboveLobby.test.ts`),
 * and the live probe now holds the screen for forty-five uninterrupted seconds.
 * Which immediately exposed the next thing: at 1280x633 the recap measured
 * `scrollHeight 1202` against `clientHeight 595`. The podium was on the wall
 * and REMATCH — the screen's one action, and the reason a class plays round
 * four — was a thousand pixels below it, behind a scroll gesture nobody makes
 * on a projector.
 *
 * A wall is not a page. Nothing on it scrolls, because nobody is holding it.
 * So the recap is a fixed two-column grid: the podium and the winner on the
 * left, the class's coverage and the one button on the right, and the ONLY
 * region allowed to overflow is the list of words to reteach.
 *
 * jsdom has no layout, so these assert the STRUCTURE that makes fitting
 * possible — the invariants a CSS change would have to break on its way to
 * putting the button off-screen again — not the pixel heights themselves. The
 * heights were measured in a real browser; see the summary.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

import { ClassroomTvResults } from '../ClassroomTvResults';
import { WordCoverageGlance } from '../WordCoverageGlance';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

/** Thirty words is a real lesson — and the height that broke the wall. */
const WORDS = [
  'house', 'water', 'light', 'earth', 'plant', 'sleep', 'dream', 'heart',
  'voice', 'smile', 'stone', 'river', 'bridge', 'garden', 'winter', 'island',
  'forest', 'shadow', 'mirror', 'castle', 'desert', 'silver', 'travel',
  'sunset', 'puzzle', 'thunder', 'whisper', 'harvest', 'journey', 'crystal',
];

const bigSummary = (foundCount: number): ClassroomSummary => ({
  teacherName: 'Mr. Gauntlet B',
  lessonNames: ['Common English'],
  lessonIds: ['lesson-1'],
  totalWords: WORDS.length,
  classFoundCount: foundCount,
  coverage: WORDS.map((word, i) => ({ word, foundBy: i < foundCount ? ['Noa'] : [] })),
  missedWords: WORDS.slice(foundCount),
  masteryByPlayer: { Noa: { found: foundCount, total: WORDS.length } },
  podium: [
    { username: 'Noa', score: 120, rank: 1 },
    { username: 'Ari', score: 90, rank: 2 },
  ],
});

describe('the projector recap fits the wall', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it('locks its own root — a wall has no scrollbar and nobody to drag one', () => {
    render(<ClassroomTvResults summary={bigSummary(0)} onRematch={() => {}} t={t} />);
    const root = screen.getByTestId('classroom-tv-results');
    expect(root.className).toContain('overflow-hidden');
    expect(root.className).not.toContain('overflow-y-auto');
  });

  it('allows exactly one scrolling region, and it is the reteach list', () => {
    const { container } = render(
      <ClassroomTvResults summary={bigSummary(0)} onRematch={() => {}} t={t} />
    );
    const scrollers = Array.from(container.querySelectorAll<HTMLElement>('[class]')).filter((el) =>
      /overflow-y-auto/.test(el.getAttribute('class') ?? '')
    );
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0].getAttribute('data-testid')).toBe('coverage-words');
  });

  it('keeps REMATCH out of that scroller — the one action is always on the wall', () => {
    render(<ClassroomTvResults summary={bigSummary(0)} onRematch={() => {}} t={t} />);
    const rematch = screen.getByTestId('classroom-tv-rematch');
    expect(rematch.closest('[data-testid="coverage-words"]')).toBeNull();
  });

  it('splits the wall into two columns so 16:9 is used across, not down', () => {
    render(<ClassroomTvResults summary={bigSummary(0)} onRematch={() => {}} t={t} />);
    expect(screen.getByTestId('tv-recap-columns').className).toMatch(/grid-cols-/);
  });
});

describe('a plinth grows for its own content rather than clipping it', () => {
  afterEach(cleanup);

  /**
   * Caught on the wall with three real players: the third-place plinth is the
   * shortest, and at projector scale its rank digit, its score and its
   * "0 of 30 words" sub-line together stand taller than 7rem — so the sub-line
   * hung out of the bottom of the pink block and the digit went under the
   * placard. A fixed `height` cannot lose that argument gracefully; a
   * `min-height` steps the podium exactly the same way and then gets out of
   * the content's way.
   */
  it('sets a minimum height, never a fixed one', () => {
    render(
      <ClassroomTvResults
        summary={{
          ...bigSummary(0),
          podium: [
            { username: 'Noa', score: 120, rank: 1, wordsFound: 4, totalWords: 30 },
            { username: 'Ari', score: 90, rank: 2, wordsFound: 3, totalWords: 30 },
            { username: 'Dan', score: 60, rank: 3, wordsFound: 1, totalWords: 30 },
          ],
        }}
        t={t}
      />
    );
    const third = screen.getByTestId('podium-place-3');
    const plinth = third.querySelector<HTMLElement>('[style]');
    expect(plinth?.style.minHeight).toBeTruthy();
    expect(plinth?.style.height).toBe('');
  });

  it('still steps the three plinths — first is tallest', () => {
    render(
      <ClassroomTvResults
        summary={{
          ...bigSummary(0),
          podium: [
            { username: 'Noa', score: 120, rank: 1 },
            { username: 'Ari', score: 90, rank: 2 },
            { username: 'Dan', score: 60, rank: 3 },
          ],
        }}
        t={t}
      />
    );
    const h = (rank: number) =>
      Number(screen.getByTestId(`podium-place-${rank}`).getAttribute('data-plinth-height'));
    expect(h(1)).toBeGreaterThan(h(2));
    expect(h(2)).toBeGreaterThan(h(3));
  });
});

describe('the projector coverage panel shows the reteach list, not the register', () => {
  afterEach(cleanup);

  it('prints only the words still to teach — the meter already said how many', () => {
    render(
      <WordCoverageGlance
        summary={bigSummary(28)}
        username=""
        isTeacher
        neverPlaced={new Set()}
        size="projector"
        missedOnly
        t={t}
      />
    );
    // Two missed out of thirty: two chips, and not one of the found ones.
    expect(screen.getByTestId('lesson-word-journey')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-word-crystal')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-word-house')).not.toBeInTheDocument();
  });

  it('caps the list and says how many it did not print', () => {
    render(
      <WordCoverageGlance
        summary={bigSummary(0)}
        username=""
        isTeacher
        neverPlaced={new Set()}
        size="projector"
        missedOnly
        maxChips={12}
        t={t}
      />
    );
    const chips = screen.getAllByTestId(/^lesson-word-/);
    expect(chips).toHaveLength(12);
    expect(screen.getByTestId('coverage-more')).toHaveTextContent('18');
  });

  it('says nothing at all when the class swept it — the gold meter is the story', () => {
    render(
      <WordCoverageGlance
        summary={bigSummary(WORDS.length)}
        username=""
        isTeacher
        neverPlaced={new Set()}
        size="projector"
        missedOnly
        t={t}
      />
    );
    expect(screen.queryAllByTestId(/^lesson-word-/)).toHaveLength(0);
    expect(screen.getByTestId('coverage-sweep')).toBeInTheDocument();
    // …but the panel that held the list must not become a large empty box on
    // the one screen whose entire point is 100%. The sweep FILLS it.
    expect(screen.getByTestId('coverage-all-found')).toBeInTheDocument();
  });

  it('leaves no empty panel on any other round — the list is the content', () => {
    render(
      <WordCoverageGlance
        summary={bigSummary(28)}
        username=""
        isTeacher
        neverPlaced={new Set()}
        size="projector"
        missedOnly
        t={t}
      />
    );
    expect(screen.queryByTestId('coverage-all-found')).not.toBeInTheDocument();
  });

  it('still lists every word on a phone — the card is held, and read', () => {
    render(
      <WordCoverageGlance
        summary={bigSummary(28)}
        username=""
        isTeacher
        neverPlaced={new Set()}
        t={t}
      />
    );
    expect(screen.getAllByTestId(/^lesson-word-/)).toHaveLength(WORDS.length);
  });
});

/**
 * Contrast, measured rather than eyeballed. Each of these three was computed
 * against its real background and came back under WCAG AA for the size it is
 * rendered at — the drumroll line at 3.50:1, the plinth's rank digit on the
 * pink third-place fill at 3.47:1, and the "of N" caption on the same pink at
 * 4.20:1. They read as smudges at the back of a room, which is the only place
 * this screen is ever read from.
 */
describe('round-end text clears WCAG AA at the size it is drawn', () => {
  afterEach(cleanup);

  const source = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('never fades the winner drumroll to 40% — 3.50:1 on navy-elevated', () => {
    expect(source('components/education/results/WinnerSpotlight.tsx')).not.toContain(
      'text-neo-white/40'
    );
  });

  it('never fades a plinth digit to 60% — 3.47:1 of black on the pink third', () => {
    expect(source('components/education/results/ResultsPodium.tsx')).not.toContain('opacity-60');
  });

  it('never fades the student placing caption to 70% — 4.20:1 on the same pink', () => {
    expect(source('components/education/results/StudentRoundOutcome.tsx')).not.toContain(
      'opacity-70'
    );
  });
});
