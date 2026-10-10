import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';

vi.mock('@/hooks/useAssignments');
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: vi.fn(() => ({
    lessons: [{ id: 'lesson-1', name: 'Basic', words: [{ word: 'test' }] }],
    isLoading: false,
    createLesson: vi.fn(),
  })),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'teacher-1' }, isLoading: false })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (key: string) => key, language: 'en' })),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(() => ({ classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en' }] })),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: true, loading: false }),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
}));

describe('AssignmentCreator word goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createAssignment: vi.fn(),
      assignments: [],
    });
  });

  it('shows word-count and word-list modes and a count field when word-count is picked', () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={vi.fn()}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('assignment-mode-word-count')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-mode-word-list')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('assignment-mode-word-count'));
    expect(screen.getByTestId('word-count-goal')).toBeInTheDocument();
    expect(screen.queryByText('teacher.assignment.lessonLabel')).not.toBeInTheDocument();
  });
});
