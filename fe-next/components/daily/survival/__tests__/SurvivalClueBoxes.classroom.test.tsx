import React from 'react';
import { render } from '@testing-library/react';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { AccumulatedClue, TargetAttempt } from '../types';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const attempt: TargetAttempt = { word: 'HELLO', feedback: [], timestamp: 0, isDiscovery: false };
const clues = new Map<number, AccumulatedClue>([[0, { letter: 'W', type: 'green' } as AccumulatedClue]]);
const base = {
  currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
  targetWord: 'WORLD',
  attempts: [attempt],
  accumulatedClues: clues,
  revealedLetters: new Set<number>(),
  knownLetters: new Set<string>(['O']),
  latestAttemptFeedback: [{ letter: 'H', feedback: 'gray' }, { letter: 'O', feedback: 'yellow' }] as never,
  isClueGaining: false,
  skipAnimations: true,
  gameDir: 'ltr' as const,
  t: (key: string) => key,
};
const STATES = {
  overlay: { showFeedbackOverlay: true },
  board: { showFeedbackOverlay: false },
  goal: { showFeedbackOverlay: false, attempts: [], explainRules: true },
} as const;
const DARK = /bg-neo-navy|text-neo-white|text-white|text-neo-cream|border-neo-white|text-neo-cyan(\s|$)|text-neo-yellow(\s|$)|text-amber-300/;
const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');
// The not-in-word tile is a solid slate fill with white ink, which the contract allows.
const darkOf = (el: Element) => classesOf(el).filter((c) => DARK.test(c) && !c.includes('bg-slate-500'));

describe('SurvivalClueBoxes in a classroom word hunt', () => {
  it.each(Object.keys(STATES) as (keyof typeof STATES)[])('arcade %s keeps its exact classes', (state) => {
    const { container } = render(<SurvivalClueBoxes {...base} {...STATES[state]} />);
    expect(classesOf(container.firstElementChild!)).toMatchSnapshot();
  });

  it.each(Object.keys(STATES) as (keyof typeof STATES)[])('classroom %s is a cream panel with page ink', (state) => {
    const { container } = render(<ClassroomBoardProvider value><SurvivalClueBoxes {...base} {...STATES[state]} /></ClassroomBoardProvider>);
    expect(container.firstElementChild!.className).toContain('bg-edu-surface');
    expect(darkOf(container.firstElementChild!)).toEqual([]);
  });
});
