import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { assignFirstAssignmentTemplate } from '@/lib/education/firstAssignmentTemplates';

vi.mock('@/lib/education/firstAssignmentTemplates', async () => {
  const actual = await vi.importActual<typeof import('@/lib/education/firstAssignmentTemplates')>(
    '@/lib/education/firstAssignmentTemplates',
  );
  return {
    ...actual,
    assignFirstAssignmentTemplate: vi.fn(),
  };
});

vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({ createAssignment: vi.fn(), assignments: [] }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({ lessons: [], isLoading: false, createLesson: vi.fn() }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en' }],
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, isLoading: false }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false }),
}));
vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherFirstAssignmentTemplate: vi.fn(),
  trackEduTeacherActionFailed: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const mockAssign = assignFirstAssignmentTemplate as unknown as ReturnType<typeof vi.fn>;

describe('AssignmentCreator — first-assignment starter packs', () => {
  const onComplete = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssign.mockResolvedValue({ success: true, assigned: true, lesson: { id: 'l1' } });
  });

  it('shows starter packs instead of an empty lesson dropdown', () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={onComplete}
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('first-assignment-templates')).toBeInTheDocument();
    expect(screen.getByTestId('first-assignment-template-starter-animals-en')).toBeInTheDocument();
    expect(screen.getByTestId('first-assignment-template-starter-colors-en')).toBeInTheDocument();
    expect(screen.queryByText('teacher.assignment.typeLabel')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('one tap assigns the pack as a Word Craft homework due tomorrow', async () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={onComplete}
        isOpen={true}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId('first-assignment-template-starter-animals-en'));

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith(
        expect.objectContaining({
          classroomId: 'classroom-1',
          teacherId: 'teacher-1',
          template: expect.objectContaining({ id: 'starter-animals-en' }),
        }),
      );
    });
    expect(onComplete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
