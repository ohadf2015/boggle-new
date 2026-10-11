import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LessonTarget } from './LessonTarget';
import { CLASSIC_LESSON } from '@/lib/tutorial/lesson/lessonEngine';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (k: string, vars?: Record<string, string | number>) =>
      vars ? `${k}|${Object.values(vars).join(',')}` : k,
  }),
}));

const [trace, findAny] = CLASSIC_LESSON.steps;
const path = [
  { row: 1, col: 2, letter: 'C' },
  { row: 2, col: 2, letter: 'A' },
  { row: 3, col: 2, letter: 'T' },
];

describe('LessonTarget', () => {
  it('given a trace step, exposes the word and its tile path for drivers', () => {
    render(<LessonTarget step={trace} target="CAT" path={path} formedWord="" oops={null} />);
    const el = screen.getByTestId('lesson-target');
    expect(el).toHaveAttribute('data-word', 'CAT');
    expect(JSON.parse(el.getAttribute('data-path') ?? '')).toEqual([[1, 2], [2, 2], [3, 2]]);
  });

  it('given a find step, shows no word and no path', () => {
    render(<LessonTarget step={findAny} target={null} path={null} formedWord="" oops={null} />);
    const el = screen.getByTestId('lesson-target');
    expect(el).toHaveAttribute('data-word', '');
    expect(el).toHaveAttribute('data-path', '[]');
  });

  it('fills the target tiles live as the player drags', () => {
    render(<LessonTarget step={trace} target="CAT" path={path} formedWord="CA" oops={null} />);
    const states = [...document.querySelectorAll('[data-slot-state]')].map((n) => n.getAttribute('data-slot-state'));
    expect(states).toEqual(['match', 'match', 'ghost']);
  });
});
