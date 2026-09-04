/**
 * AssignmentCreator — vocabulary focus picker.
 * Only focuses the selected lesson can support are enabled; the choice is
 * passed through as `practice_focus`.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';

vi.mock('@/hooks/useAssignments');
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: vi.fn(() => ({
    lessons: [
      {
        id: 'lesson-rich',
        name: 'Rich',
        words: [
          { word: 'a', canIntegrate: true, definition: 'da', synonyms: ['x'] },
          { word: 'b', canIntegrate: true, definition: 'db', synonyms: ['y'] },
          { word: 'c', canIntegrate: true, definition: 'dc', synonyms: ['z'] },
          { word: 'd', canIntegrate: true, definition: 'dd', synonyms: ['q'] },
        ],
      },
      { id: 'lesson-bare', name: 'Bare', words: [{ word: 'a', canIntegrate: true }] },
    ],
    isLoading: false,
  })),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'teacher-1' }, isLoading: false })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')}` : key,
    language: 'en',
  })),
}));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

const mockCreateAssignment = vi.fn();

const renderIt = () =>
  render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={vi.fn()} />);

describe('AssignmentCreator — practice focus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as jest.Mock).mockReturnValue({ createAssignment: mockCreateAssignment });
    mockCreateAssignment.mockResolvedValue({ success: true });
  });

  it('shows the focus picker only once a lesson is selected for a practice assignment', () => {
    renderIt();
    expect(screen.queryByRole('radiogroup', { name: 'teacher.assignment.focus.label' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-rich' } });
    const group = screen.getByRole('radiogroup', { name: 'teacher.assignment.focus.label' });
    expect(within(group).getByRole('radio', { name: /teacher.assignment.focus.any/ })).toHaveAttribute('aria-checked', 'true');

    // duel assignments have no focus
    fireEvent.click(screen.getByText('teacher.assignment.duelChallenge'));
    expect(screen.queryByRole('radiogroup', { name: 'teacher.assignment.focus.label' })).not.toBeInTheDocument();
  });

  it('enables only the focuses the lesson supports and explains the rest', () => {
    renderIt();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-rich' } });
    const group = screen.getByRole('radiogroup', { name: 'teacher.assignment.focus.label' });

    expect(within(group).getByRole('radio', { name: /education.vocabFocus.focus.definition/ })).toBeEnabled();
    expect(within(group).getByRole('radio', { name: /education.vocabFocus.focus.synonym/ })).toBeEnabled();
    expect(within(group).getByRole('radio', { name: /education.vocabFocus.focus.antonym/ })).toBeDisabled();
    expect(within(group).getByRole('radio', { name: /education.vocabFocus.focus.context/ })).toBeDisabled();
    expect(within(group).getByText('education.vocabFocus.unlock.antonym|min=4')).toBeInTheDocument();
  });

  it('submits the chosen focus as practice_focus', async () => {
    renderIt();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-rich' } });
    fireEvent.click(screen.getByRole('radio', { name: /education.vocabFocus.focus.synonym/ }));
    fireEvent.click(screen.getByText('teacher.assignment.selectDate'));
    fireEvent.click(screen.getByText('teacher.assignment.today'));
    fireEvent.click(screen.getByText('teacher.assignment.create'));

    await waitFor(() => expect(mockCreateAssignment).toHaveBeenCalled());
    expect(mockCreateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ lesson_id: 'lesson-rich', assignment_type: 'practice', practice_focus: 'synonym' })
    );
  });

  it('resets the focus to any when the lesson changes to one that cannot support it', async () => {
    renderIt();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-rich' } });
    fireEvent.click(screen.getByRole('radio', { name: /education.vocabFocus.focus.synonym/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-bare' } });
    expect(screen.getByRole('radio', { name: /teacher.assignment.focus.any/ })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByText('teacher.assignment.selectDate'));
    fireEvent.click(screen.getByText('teacher.assignment.today'));
    fireEvent.click(screen.getByText('teacher.assignment.create'));
    await waitFor(() => expect(mockCreateAssignment).toHaveBeenCalled());
    expect(mockCreateAssignment).toHaveBeenCalledWith(expect.objectContaining({ practice_focus: 'any' }));
  });
});
