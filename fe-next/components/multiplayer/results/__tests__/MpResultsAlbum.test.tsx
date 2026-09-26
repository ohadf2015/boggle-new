/**
 * The results "album" panels (desktop/TV right column): ROUND AWARDS on the
 * intermission, ROUND BY ROUND on the series final.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MpRoundAwards, MpSeriesGrid } from '../MpResultsAlbum';

vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('MpRoundAwards', () => {
  it('Given awards, Then each stamp names its word, value and owner', () => {
    render(
      <MpRoundAwards
        awards={{
          best: { username: 'Maya', word: 'gult', value: 23 },
          longest: { username: 'Leo', word: 'quartz', value: 6 },
          most: { username: 'Leo', value: 3 },
        }}
        t={t}
      />,
    );
    expect(screen.getByTestId('mp-award-best').textContent).toMatch(/gult.*\+23.*Maya/);
    expect(screen.getByTestId('mp-award-longest').textContent).toMatch(/quartz.*letterCount.*6.*Leo/);
    // "Most words" is the bare count under its label (never "1 words")
    expect(screen.getByTestId('mp-award-most').textContent).toMatch(/awardMost3Leo/);
    // Points stay "+23" in RTL: every "+N" is an LTR island
    expect(screen.getByTestId('mp-award-best').querySelector('[dir="ltr"]')?.textContent).toBe('+23');
  });

  it('Given nobody counted a word, Then the panel is not rendered at all', () => {
    const { container } = render(<MpRoundAwards awards={{ best: null, longest: null, most: null }} t={t} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('MpSeriesGrid', () => {
  it("Given a series, Then each round's top score is stamped, blanks read quiet, my row is marked and totals are the board's", () => {
    render(
      <MpSeriesGrid
        grid={{
          rounds: 3,
          top: [40, 20, null],
          rows: [
            { username: 'Maya', isMe: false, cells: [40, 10, 0], total: 50 },
            { username: 'Leo', isMe: true, cells: [15, 20, 0], total: 35 },
          ],
        }}
        t={t}
      />,
    );
    const [maya, leo] = screen.getAllByTestId('mp-series-grid-row');
    expect(leo.getAttribute('data-me')).toBe('true');
    const topOf = (row: HTMLElement) => Array.from(row.querySelectorAll('[data-top]')).map((c) => c.getAttribute('data-top'));
    expect(topOf(maya)).toEqual(['true', 'false', 'false']);
    expect(topOf(leo)).toEqual(['false', 'true', 'false']);
    expect(maya.textContent).toContain('·');
    expect(maya.lastElementChild?.textContent).toBe('50');
    expect(leo.lastElementChild?.textContent).toBe('35');
  });
});
