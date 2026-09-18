/**
 * StudentLessonView — a Word Craft assignment (practice_focus NULL) gets a
 * one-tap "Play Word Craft" button that deep-links into the Word Craft variant.
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
// The wider "what may I practise" source. Empty here: these cases are about
// how a HOMEWORK card renders, so the second source must not add rows.
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => ({ lessons: [], isLoading: false, error: null }),
}));

import StudentLessonView from '../StudentLessonView';


const lesson = { id: 'l1', name: 'Rocks', words: [{ word: 'rock', canIntegrate: true }] };

function withAssignment(assignment: Record<string, unknown> | null) {
  mockUseStudentProgress.mockReturnValue({
    lessons: [{ lessonId: 'l1', status: 'assigned', lesson, progress: null, assignment }],
    isLoading: false,
    error: null,
  });
}

describe('StudentLessonView — Word Craft assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStudentClassroom.mockReturnValue({ level: 'core', isLoading: false });
  });

  it('Given a Word Craft assignment, When the card renders, Then one tap opens Word Craft for that lesson', () => {
    withAssignment({ id: 'a1', lesson_id: 'l1', classroom_id: 'c1', practice_focus: null });
    render(<StudentLessonView />);
    const button = screen.getByTestId('assigned-wordcraft-practice');
    expect(button).toHaveTextContent('education.wordcraftAssignment.studentPlay');
    expect(screen.getByTestId('assignment-wordcraft-chip')).toBeInTheDocument();
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith('/en/student/lessons/l1?mode=solo_board&variant=wordcraft');
  });

  it('Given a student-picks or focus assignment, Then no Word Craft button', () => {
    withAssignment({ id: 'a1', practice_focus: 'any' });
    const { unmount } = render(<StudentLessonView />);
    expect(screen.queryByTestId('assigned-wordcraft-practice')).not.toBeInTheDocument();
    unmount();
    withAssignment({ id: 'a1', practice_focus: 'synonym' });
    render(<StudentLessonView />);
    expect(screen.queryByTestId('assigned-wordcraft-practice')).not.toBeInTheDocument();
  });

  it('Given optional practice with no assignment, Then no Word Craft button', () => {
    withAssignment(null);
    render(<StudentLessonView />);
    expect(screen.queryByTestId('assigned-wordcraft-practice')).not.toBeInTheDocument();
  });
});
