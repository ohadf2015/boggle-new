import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { assignAssignmentTemplate } from '@/lib/education/assignmentTemplates';
import { trackEduTemplateAssigned } from '@/lib/education/telemetry';

vi.mock('@/lib/education/assignmentTemplates', async () => {
  const actual = await vi.importActual<typeof import('@/lib/education/assignmentTemplates')>(
    '@/lib/education/assignmentTemplates',
  );
  return {
    ...actual,
    assignAssignmentTemplate: vi.fn(),
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
  trackEduTemplateAssigned: vi.fn(),
  trackEduTeacherActionFailed: vi.fn(),
  trackEduFirstAssignmentCreated: vi.fn(),
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

const mockAssign = assignAssignmentTemplate as unknown as ReturnType<typeof vi.fn>;

describe('AssignmentCreator — assignment template gallery', () => {
  const onComplete = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssign.mockResolvedValue({ success: true, assigned: true, lesson: { id: 'l1' } });
  });

  it('shows the gallery instead of an empty lesson dropdown', () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={onComplete}
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('assignment-template-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-template-en-k2-english-animals')).toBeInTheDocument();
    expect(screen.queryByText('teacher.assignment.typeLabel')).toBeNull();
    expect(screen.queryByTestId('assignment-lesson-picker')).toBeNull();
  });

  it('one tap assigns the template and fires edu_template_assigned', async () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={onComplete}
        isOpen={true}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId('assignment-template-assign-en-k2-english-animals'));

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith(
        expect.objectContaining({
          classroomId: 'classroom-1',
          teacherId: 'teacher-1',
          template: expect.objectContaining({ id: 'en-k2-english-animals' }),
        }),
      );
    });
    expect(trackEduTemplateAssigned).toHaveBeenCalledWith({
      templateId: 'en-k2-english-animals',
      classroomId: 'classroom-1',
    });
    expect(onComplete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
