import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LessonBar } from './LessonBar';
import { CLASSIC_FIRST_ROUND_STEPS } from '@/lib/tutorial/lesson/lessonEngine';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (k: string, vars?: Record<string, string | number>) =>
      vars ? `${k}|${Object.values(vars).join(',')}` : k,
  }),
}));

vi.mock('framer-motion', () => {
  const React2 = require('react');
  const MOTION = new Set(['initial', 'animate', 'exit', 'transition', 'layout', 'variants']);
  const make = (tag: string) =>
    React2.forwardRef(function Motion(props: Record<string, unknown>, ref: unknown) {
      const clean: Record<string, unknown> = {};
      for (const k of Object.keys(props)) if (!MOTION.has(k)) clean[k] = props[k];
      return React2.createElement(tag, { ...clean, ref });
    });
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React2.createElement(React2.Fragment, null, children),
    m: new Proxy({}, { get: (_t, tag: string) => make(tag === 'span' ? 'span' : 'div') }),
    useReducedMotion: () => false,
  };
});

const base = {
  steps: CLASSIC_FIRST_ROUND_STEPS,
  hintWord: 'cat',
  hintPath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
  onSkip: () => {},
};

describe('LessonBar', () => {
  it('teaches the hinted word on the first step', () => {
    render(<LessonBar {...base} completedCount={0} />);
    expect(screen.getByTestId('lesson-caption').textContent).toContain('lesson.try');
    expect(screen.getByTestId('lesson-caption').textContent).toContain('cat');
  });

  it('exposes progress for the step count', () => {
    render(<LessonBar {...base} completedCount={2} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
    expect(bar.getAttribute('aria-valuemax')).toBe(String(CLASSIC_FIRST_ROUND_STEPS.length));
  });

  it('publishes the hint path so the hand and the e2e spec can follow it', () => {
    render(<LessonBar {...base} completedCount={0} />);
    const raw = screen.getByTestId('lesson-bar').getAttribute('data-lesson-path');
    expect(JSON.parse(raw ?? '[]')).toEqual([[0, 0], [0, 1], [1, 1]]);
  });

  it('is skippable', () => {
    const onSkip = vi.fn();
    render(<LessonBar {...base} completedCount={1} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'lesson.skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('celebrates a finished step with praise', () => {
    const { rerender } = render(<LessonBar {...base} completedCount={0} />);
    expect(screen.queryByTestId('lesson-praise')).toBeNull();
    rerender(<LessonBar {...base} completedCount={1} />);
    expect(screen.getByTestId('lesson-praise').textContent).toBe('lesson.nice');
  });

  it('shows the completion line once every step is done', () => {
    render(<LessonBar {...base} completedCount={CLASSIC_FIRST_ROUND_STEPS.length} />);
    expect(screen.getByTestId('lesson-caption').textContent).toBe('lesson.complete');
  });
});
