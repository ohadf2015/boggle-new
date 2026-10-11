import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LessonSheet } from './LessonSheet';
import { LESSON_LANE_H } from './lessonLane';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    dir: 'ltr',
    t: (k: string, vars?: Record<string, string | number>) => (vars ? `${k}|${Object.values(vars).join(',')}` : k),
  }),
}));

const win = { key: 's1', kind: 'success' as const, word: 'cat', streak: 1, stepIndex: 0 };

describe('LessonSheet', () => {
  it('renders nothing between steps', () => {
    const { container } = render(<LessonSheet event={null} retryWord={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sits in the reserved lane, exactly as tall as the space the game leaves for it', () => {
    render(<LessonSheet event={win} retryWord={null} />);
    expect(screen.getByTestId('lesson-sheet').className).toContain(LESSON_LANE_H);
  });

  it('praises the win and names the word', () => {
    render(<LessonSheet event={win} retryWord={null} />);
    expect(screen.getByTestId('lesson-sheet')).toHaveAttribute('data-kind', 'success');
    expect(screen.getByText('firstLesson.praise.nice')).toBeInTheDocument();
    expect(screen.getByText('firstLesson.found|CAT')).toBeInTheDocument();
  });

  it('on a miss, says what to try next', () => {
    render(<LessonSheet event={{ key: 'f1', kind: 'oops', message: 'Not a word', streak: 0 }} retryWord="CAT" />);
    expect(screen.getByText('firstLesson.oops')).toBeInTheDocument();
    expect(screen.getByText(/firstLesson\.tryWord\|CAT/)).toBeInTheDocument();
  });

  it('leaves the streak to the HUD, so the word and its points always fit', () => {
    render(<LessonSheet event={{ ...win, streak: 3 }} retryWord={null} points={202} />);
    expect(screen.queryByTestId('lesson-sheet-streak')).toBeNull();
  });

  it('stamps the points the word scored', () => {
    render(<LessonSheet event={win} retryWord={null} points={10} />);
    expect(screen.getByTestId('lesson-sheet-points')).toHaveTextContent('+10');
  });
});
