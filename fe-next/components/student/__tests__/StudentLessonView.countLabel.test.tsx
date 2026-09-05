/**
 * When two true numbers disagree on screen, the label has to say which is which.
 *
 * Seen live on 2026-09-05: a student's lesson card read "Week 3 Vocabulary —
 * 8 Words" while a pill on the same screen read "10 words due for review", for
 * the same ten-word lesson. Both numbers are correct — 8 is the words at that
 * student's differentiation level, 10 is the lesson — and neither said so, so
 * the pair just reads as a bug.
 *
 * The count stays level-filtered (a support student who sees 8 words must be
 * able to reach 100%). Only the label changes, and only when the two differ.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const MOTION_PROPS = ['variants', 'initial', 'animate', 'exit', 'whileHover', 'whileTap', 'transition', 'custom'];
  const passthrough = (tag: string) => {
    function Passthrough({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) {
      const dom = Object.fromEntries(Object.entries(rest).filter(([k]) => !MOTION_PROPS.includes(k)));
      return React.createElement(tag, dom, children);
    }
    Passthrough.displayName = `AdaptiveMotion.${tag}`;
    return Passthrough;
  };
  return {
    AdaptiveMotion: { div: passthrough('div'), span: passthrough('span'), h2: passthrough('h2') },
    AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));
vi.mock('@/components/ui/EnhancedEmptyState', () => ({ EnhancedEmptyState: () => <div>empty</div> }));
vi.mock('@/components/ui/button', () => ({ Button: (p: { children?: React.ReactNode }) => <button>{p.children}</button> }));
vi.mock('@/components/practice/QuickPracticeButton', () => ({ QuickPracticeButton: () => <button>practice</button> }));

const { mockUseStudentProgress, mockUseStudentClassroom } = vi.hoisted(() => ({
  mockUseStudentProgress: vi.fn(),
  mockUseStudentClassroom: vi.fn(),
}));
vi.mock('@/hooks/useStudentProgress', () => ({ useStudentProgress: () => mockUseStudentProgress() }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => mockUseStudentClassroom() }));

import StudentLessonView from '../StudentLessonView';

/** Three words, of which a support student practises two. */
const MIXED_LESSON = {
  id: 'l1',
  name: 'Rocks',
  words: [
    { word: 'rock', canIntegrate: true, level: 'support' },
    { word: 'igneous', canIntegrate: true },
    { word: 'metamorphic', canIntegrate: true, level: 'challenge' },
  ],
};

/** Every word is core, so the two populations are the same. */
const FLAT_LESSON = {
  id: 'l2',
  name: 'Weather',
  words: [
    { word: 'cloud', canIntegrate: true },
    { word: 'rain', canIntegrate: true },
  ],
};

function renderWith(lesson: unknown, level: string) {
  mockUseStudentClassroom.mockReturnValue({ level, isLoading: false });
  mockUseStudentProgress.mockReturnValue({
    lessons: [{ lessonId: 'l1', status: 'assigned', lesson, progress: null }],
    isLoading: false,
    error: null,
  });
  render(<StudentLessonView />);
}

describe('StudentLessonView — the word count says which population it counts', () => {
  it('names both numbers when the student practises fewer words than the lesson holds', () => {
    // GIVEN a support student on a three-word lesson, two of which are theirs
    renderWith(MIXED_LESSON, 'support');

    // THEN the label carries both figures instead of a bare "2 Words"
    expect(screen.getByText(/student\.lessons\.wordsAtYourLevel/)).toBeInTheDocument();
    expect(screen.queryByText(/^2 student\.lessons\.words$/)).not.toBeInTheDocument();
  });

  it('stays the plain count when the two populations are identical', () => {
    // GIVEN a core student on a lesson with no differentiation
    renderWith(FLAT_LESSON, 'core');

    // THEN nothing is disambiguated, because nothing is ambiguous
    expect(screen.getByText(/^2 student\.lessons\.words$/)).toBeInTheDocument();
    expect(screen.queryByText(/student\.lessons\.wordsAtYourLevel/)).not.toBeInTheDocument();
  });

  // `wordsForLevel` (lib/education/differentiation.ts:46) deliberately degrades
  // to the FULL list when the level filter would leave a student with nothing —
  // better the whole lesson than an empty one. So the two populations are equal
  // in that case and there is nothing to disambiguate. Asserted here so a future
  // change to that fallback shows up as a label change too.
  it('stays plain when the level filter would empty the lesson and it degrades to all words', () => {
    // GIVEN a support student and a lesson whose only word is challenge-level
    renderWith(
      { id: 'l1', name: 'Rocks', words: [{ word: 'metamorphic', canIntegrate: true, level: 'challenge' }] },
      'support'
    );

    // THEN they see the one word the lesson has, labelled plainly
    expect(screen.getByText(/^1 student\.lessons\.words$/)).toBeInTheDocument();
    expect(screen.queryByText(/student\.lessons\.wordsAtYourLevel/)).not.toBeInTheDocument();
  });
});
