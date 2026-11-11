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
