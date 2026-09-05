/**
 * StudentLessonView — when the teacher pinned a vocabulary focus on the
 * assignment, the card offers a one-tap "practise <focus>" button that deep
 * links into `?mode=vocab_focus&focus=<x>`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')}` : key,
    language: 'en',
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
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
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, size, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock('@/components/practice/QuickPracticeButton', () => ({ QuickPracticeButton: () => <button>practice</button> }));

const { mockUseStudentProgress, mockUseStudentClassroom } = vi.hoisted(() => ({
  mockUseStudentProgress: vi.fn(),
  mockUseStudentClassroom: vi.fn(),
}));
vi.mock('@/hooks/useStudentProgress', () => ({ useStudentProgress: () => mockUseStudentProgress() }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => mockUseStudentClassroom() }));

import StudentLessonView from '../StudentLessonView';

const lesson = { id: 'l1', name: 'Rocks', words: [{ word: 'rock', canIntegrate: true }] };

describe('StudentLessonView — assigned vocabulary focus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStudentClassroom.mockReturnValue({ level: 'core', isLoading: false });
  });

  it('offers a focus practice button that deep-links to the focus mode', () => {
    mockUseStudentProgress.mockReturnValue({
      lessons: [
        {
          lessonId: 'l1',
          status: 'assigned',
          lesson,
          progress: null,
          assignment: { id: 'a1', lesson_id: 'l1', classroom_id: 'c1', practice_focus: 'synonym' },
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<StudentLessonView />);

    const button = screen.getByTestId('assigned-focus-practice');
    expect(button).toHaveTextContent('education.vocabFocus.startAssigned|focus=education.vocabFocus.focus.synonym');
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith('/en/student/lessons/l1?mode=vocab_focus&focus=synonym');
  });

  it('shows nothing extra when the assignment has no focus (or "any")', () => {
    mockUseStudentProgress.mockReturnValue({
      lessons: [
        { lessonId: 'l1', status: 'assigned', lesson, progress: null, assignment: { id: 'a1', practice_focus: 'any' } },
        { lessonId: 'l2', status: 'assigned', lesson: { ...lesson, id: 'l2' }, progress: null },
      ],
      isLoading: false,
      error: null,
    });

    render(<StudentLessonView />);
    expect(screen.queryByTestId('assigned-focus-practice')).not.toBeInTheDocument();
  });
});
