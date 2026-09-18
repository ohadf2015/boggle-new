/**
 * AssignmentCreator — Word Craft as the recommended default homework mode.
 * `lesson_assignments` has no mode column: Word Craft is stored as
 * practice_focus 'wordcraft' (see lib/education/wordcraftAssignment.ts).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';

vi.mock('@/hooks/useAssignments');
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: vi.fn(() => ({
    lessons: [{ id: 'lesson-1', name: 'Animals', words: [{ word: 'cat', canIntegrate: true }] }],
    isLoading: false,
  })),
}));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: [] }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'teacher-1' }, isLoading: false })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (key: string) => key, language: 'en' })),
}));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

const mockCreateAssignment = vi.fn();
const renderIt = () =>
  render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={vi.fn()} />);

async function submit() {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-1' } });
  fireEvent.click(screen.getByText('teacher.assignment.selectDate'));
  fireEvent.click(screen.getByText('teacher.assignment.tomorrow'));
  fireEvent.click(screen.getByText('teacher.assignment.create'));
  await waitFor(() => expect(mockCreateAssignment).toHaveBeenCalled());
  return mockCreateAssignment.mock.calls[0][0];
}

describe('AssignmentCreator — Word Craft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as jest.Mock).mockReturnValue({ createAssignment: mockCreateAssignment });
    mockCreateAssignment.mockResolvedValue({ success: true });
  });

  it('Given the dialog opens, Then Word Craft is the pre-selected, recommended mode', () => {
    renderIt();
    const option = screen.getByTestId('assignment-mode-wordcraft');
    expect(option).toHaveAttribute('aria-pressed', 'true');
    expect(option).toHaveTextContent('education.wordcraftAssignment.recommended');
  });

  it("Given the default, When the teacher picks a lesson + date and creates, Then it saves as Word Craft (practice_focus 'wordcraft')", async () => {
    renderIt();
    const payload = await submit();
    expect(payload).toEqual(expect.objectContaining({
      lesson_id: 'lesson-1', assignment_type: 'practice', practice_focus: 'wordcraft',
    }));
  });

  it('Given Word Craft, Then no focus drill picker is shown (no decision overload)', () => {
    renderIt();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-1' } });
    expect(screen.queryByRole('radiogroup', { name: 'teacher.assignment.focus.label' })).not.toBeInTheDocument();
  });

  it("Given Practice with the student-picks default, When created, Then practice_focus is 'any' (unchanged legacy behaviour)", async () => {
    renderIt();
    fireEvent.click(screen.getByText('teacher.assignment.practiceMode'));
    const payload = await submit();
    expect(payload.practice_focus).toBe('any');
  });

  it('Given Duel, When created, Then practice_focus is null — a duel never reads as Word Craft', async () => {
    renderIt();
    fireEvent.click(screen.getByText('teacher.assignment.duelChallenge'));
    const payload = await submit();
    expect(payload.practice_focus).toBeNull();
  });
});
