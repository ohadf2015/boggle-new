/**
 * "+18 more" has to lead somewhere.
 *
 * The projector caps the chip list at 12 so thirty misses cannot push the
 * Rematch button off the bottom of the wall (measured: scrollHeight 1202 in a
 * 595px viewport). The cap is right. What was wrong is that the remainder was
 * a dead `<li>`: the count was honest, the words were simply not in the DOM,
 * so a teacher reading "the class missed 30" off a wall could see 12 of them
 * and had no way to reach the rest without leaving the recap.
 *
 * The list region is already the one scrollable area on the projector, so
 * expanding in place costs nothing that was not already paid for — and the
 * collapsed state stays the default, because the wall's job at the final
 * whistle is the podium and the button, not a register.
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { WordCoverageGlance } from '../WordCoverageGlance';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const WORDS = Array.from({ length: 30 }, (_, i) => `word${i + 1}`);

const summary: ClassroomSummary = {
  teacherName: 'Mr. Gauntlet B',
  lessonNames: ['Common English'],
  lessonIds: ['lesson-1'],
  totalWords: 30,
  classFoundCount: 0,
  coverage: WORDS.map((word) => ({ word, foundBy: [] })),
  missedWords: [...WORDS],
  masteryByPlayer: { Noa: { found: 0, total: 30 } },
  podium: [{ username: 'Noa', score: 0, rank: 1 }],
};

const projector = () => (
  <WordCoverageGlance
    summary={summary}
    username=""
    isTeacher
    neverPlaced={new Set()}
    size="projector"
    missedOnly
    maxChips={12}
    t={t}
  />
);

describe('WordCoverageGlance — the remainder is reachable', () => {
  afterEach(cleanup);

  it('caps the wall at 12 chips by default, as before', () => {
    render(projector());
    expect(screen.getAllByTestId(/^lesson-word-/)).toHaveLength(12);
  });

  it('the remainder is a CONTROL, not a dead label', () => {
    render(projector());
    const more = screen.getByTestId('coverage-more');
    expect(more.tagName).toBe('BUTTON');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    // It reads as a control from the back of the room: cream edge on navy.
    expect(more.className).toMatch(/border-\[(2|3)px\]/);
    expect(more.className).toMatch(/border-neo-cream/);
  });

  it('expanding prints every remaining word', () => {
    render(projector());
    fireEvent.click(screen.getByTestId('coverage-more'));
    expect(screen.getAllByTestId(/^lesson-word-/)).toHaveLength(30);
    expect(screen.getByTestId('lesson-word-word30')).toBeInTheDocument();
  });

  it('and collapses again, so the wall goes back to the podium', () => {
    render(projector());
    const more = screen.getByTestId('coverage-more');
    fireEvent.click(more);
    const less = screen.getByTestId('coverage-more');
    expect(less).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(less);
    expect(screen.getAllByTestId(/^lesson-word-/)).toHaveLength(12);
  });

  it('no control at all when nothing is hidden', () => {
    render(
      <WordCoverageGlance
        summary={summary}
        username=""
        isTeacher
        neverPlaced={new Set()}
        size="projector"
        missedOnly
        maxChips={50}
        t={t}
      />,
    );
    expect(screen.queryByTestId('coverage-more')).toBeNull();
    expect(screen.getAllByTestId(/^lesson-word-/)).toHaveLength(30);
  });

  it('the phone card is uncapped and grows no control', () => {
    render(
      <WordCoverageGlance
        summary={summary}
        username="Noa"
        neverPlaced={new Set()}
        size="card"
        t={t}
      />,
    );
    expect(screen.queryByTestId('coverage-more')).toBeNull();
    expect(screen.getAllByTestId(/^lesson-word-/)).toHaveLength(30);
  });
});
