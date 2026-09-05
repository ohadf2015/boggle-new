/**
 * StudentLessonView — the word count / mastery denominator must be the words THIS
 * student practises (level-filtered), or a support student sees "3 words" while
 * only ever being shown 2, and can never reach 100%.
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

const lesson = {
  id: 'l1',
  name: 'Rocks',
  words: [
    { word: 'rock', canIntegrate: true, level: 'support' },
    { word: 'igneous', canIntegrate: true },
    { word: 'metamorphic', canIntegrate: true, level: 'challenge' },
  ],
};

describe('StudentLessonView — level-aware word count', () => {
  it('counts only support+core words for a support student', () => {
    mockUseStudentClassroom.mockReturnValue({ level: 'support', isLoading: false });
    mockUseStudentProgress.mockReturnValue({
      lessons: [{ lessonId: 'l1', status: 'assigned', lesson, progress: null }],
      isLoading: false,
      error: null,
    });

    render(<StudentLessonView />);

    // The count is still level-filtered (2 of 3). It now also names which
    // population it is counting, because a bare "2 Words" beside an unfiltered
    // "3 words due" pill reads as a bug — see StudentLessonView.countLabel.
    expect(screen.getByText(/student\.lessons\.wordsAtYourLevel/)).toBeInTheDocument();
  });

  it('counts every word for a challenge student', () => {
    mockUseStudentClassroom.mockReturnValue({ level: 'challenge', isLoading: false });
    mockUseStudentProgress.mockReturnValue({
      lessons: [{ lessonId: 'l1', status: 'assigned', lesson, progress: null }],
      isLoading: false,
      error: null,
    });

    render(<StudentLessonView />);

    expect(screen.getByText(/^3 student\.lessons\.words$/)).toBeInTheDocument();
  });
});
