import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LessonTargetStrip } from '../LessonTargetStrip';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

describe('LessonTargetStrip', () => {
  it('counts found lesson words and hides the unfound ones behind their first letter', () => {
    render(
      <LessonTargetStrip
        targets={[{ word: 'storm', found: true }, { word: 'shadow', found: false }]}
        t={t}
        dir="ltr"
      />,
    );
    const strip = screen.getByTestId('lesson-target-strip');
    expect(strip).toHaveTextContent('education.wordBank.huntTitle:{"found":1,"total":2}');
    const chips = within(strip).getAllByRole('listitem');
    expect(chips[0]).toHaveTextContent('storm');
    expect(chips[0]).toHaveAttribute('data-found', 'true');
    expect(chips[1]).not.toHaveTextContent('shadow');
    expect(chips[1]).toHaveTextContent('S');
    expect(chips[1]).toHaveAttribute('aria-label', 'education.wordBank.huntHidden:{"length":6}');
  });

  it('never takes a tap meant for the board under it', () => {
    render(<LessonTargetStrip targets={[{ word: 'storm', found: false }]} t={t} dir="ltr" />);
    expect(screen.getByTestId('lesson-target-strip').className).toMatch(/pointer-events-none/);
  });

  it('follows the page direction for Hebrew', () => {
    render(<LessonTargetStrip targets={[{ word: 'שלום', found: false }]} t={t} dir="rtl" />);
    expect(screen.getByTestId('lesson-target-strip')).toHaveAttribute('dir', 'rtl');
  });
});

describe('LessonTargetStrip in a Lesson Word Race', () => {
  const slots = [
    { key: '0', first: 'S', rest: 4, state: 'mine' as const, word: 'storm' },
    { key: '1', first: 'S', rest: 3, state: 'taken' as const, word: 'shad', by: 'Dana', avatar: { emoji: '🐼' } },
    { key: '2', first: 'C', rest: 3, state: 'hidden' as const },
  ];

  it('Given claimed and open slots, When shown, Then the count says claimed and a classmate\'s slot names them', () => {
    render(<LessonTargetStrip slots={slots} race t={t} dir="ltr" />);
    const strip = screen.getByTestId('lesson-target-strip');
    expect(strip).toHaveTextContent('education.race.claimedCount:{"claimed":2,"total":3}');
    const chips = within(strip).getAllByRole('listitem');
    expect(chips.map((c) => c.getAttribute('data-state'))).toEqual(['mine', 'taken', 'hidden']);
    expect(chips[1]).toHaveTextContent('shad');
    expect(chips[1]).toHaveTextContent('🐼');
    expect(chips[1]).toHaveAttribute('aria-label', 'education.race.takenBy:{"word":"shad","name":"Dana"}');
    expect(chips[2]).not.toHaveTextContent('cell');
  });

});

describe('LessonTargetStrip inline (round dock under the grid)', () => {
  const slots = [
    { key: '0', first: 'S', rest: 4, state: 'mine' as const, word: 'storm' },
    { key: '1', first: 'C', rest: 3, state: 'hidden' as const },
  ];

  it('Given the inline variant, When rendered, Then it flows in its row instead of pinning to the screen bottom, and keeps to one line', () => {
    render(<LessonTargetStrip slots={slots} race inline t={t} dir="ltr" />);
    const strip = screen.getByTestId('lesson-target-strip');
    expect(strip.className).not.toMatch(/\bfixed\b/);
    expect(strip.className).toMatch(/pointer-events-none/);
    expect(within(strip).getByRole('list').className).toMatch(/flex-nowrap/);
  });

  it('Given an inline race, When rendered, Then the open masks lead the line and the count is a bare number with its full label kept for screen readers', () => {
    render(<LessonTargetStrip slots={slots} race inline t={t} dir="ltr" />);
    const strip = screen.getByTestId('lesson-target-strip');
    const chips = within(strip).getAllByRole('listitem');
    expect(chips[0]).toHaveAttribute('data-state', 'hidden');
    expect(chips[1]).toHaveAttribute('data-state', 'mine');
    expect(within(strip).getByTestId('lesson-target-count')).toHaveTextContent(/^1\/2$/);
    expect(strip).toHaveTextContent('education.race.claimedCount:{"claimed":1,"total":2}');
  });

  it('Given an inline race, When rendered, Then it is a full-size row: the count is a badge and the masks are readable tiles that scroll sideways', () => {
    render(<LessonTargetStrip slots={slots} race inline t={t} dir="ltr" />);
    const strip = screen.getByTestId('lesson-target-strip');
    expect(strip.className).toMatch(/\bmin-h-9\b/);
    const badge = within(strip).getByTestId('lesson-target-count');
    expect(badge.className).toMatch(/\bbg-neo-cyan\b/);
    expect(badge.className).toMatch(/\brounded-full\b/);
    const list = within(strip).getByRole('list');
    expect(list.className).toMatch(/overflow-x-auto/);
    expect(list.className).toMatch(/pointer-events-auto/);
    for (const chip of within(strip).getAllByRole('listitem')) expect(chip.className).toMatch(/text-\[13px\]|text-sm/);
  });
});
