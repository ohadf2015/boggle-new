import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentCreator from './AssignmentCreator';
import { useAssignments } from '@/hooks/useAssignments';

// Mock hooks
vi.mock('@/hooks/useAssignments');
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: vi.fn(() => ({
    lessons: [
      { id: 'lesson-1', name: 'Basic Vocabulary', words: [{word: 'test'}] },
      { id: 'lesson-2', name: 'Advanced Words', words: [{word: 'a'}, {word: 'b'}] },
    ],
    isLoading: false,
  })),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'teacher-1' },
    isLoading: false,
  })),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${Object.values(p).join(',')}` : key),
    language: 'en',
  })),
}));
// Free by default in every test; the cap-gate describe block overrides.
let proState = { hasPro: false, loading: false };
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(() => ({
    classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en', member_count: 5 }],
  })),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

const mockCreateAssignment = vi.fn();

const renderCreator = () =>
  render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={vi.fn()} />);

describe('AssignmentCreator — Wayground-order flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as jest.Mock).mockReturnValue({ createAssignment: mockCreateAssignment });
    mockCreateAssignment.mockResolvedValue({ success: true });
  });

  it('asks for the word list first, then who, then the mode, then the due date', () => {
    renderCreator();
    const steps = screen.getAllByTestId('assignment-step').map((s) => s.getAttribute('data-step'));
    expect(steps).toEqual(['list', 'who', 'mode', 'due']);
  });

  it('names the class and its size so the teacher knows who gets it', () => {
    renderCreator();
    expect(screen.getByTestId('assignment-who')).toHaveTextContent('Period 1');
    expect(screen.getByTestId('assignment-who')).toHaveTextContent('eg2Rep.assign.students:5');
  });

  it('shows due-date chips up front, so list + chip + assign is three taps', async () => {
    renderCreator();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-1' } });
    const chip = screen.getByRole('button', { name: 'teacher.assignment.nextWeek' });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('teacher.assignment.create'));
    await waitFor(() => expect(mockCreateAssignment).toHaveBeenCalled());
    expect(mockCreateAssignment.mock.calls[0][0]).toMatchObject({ lesson_id: 'lesson-1', classroom_id: 'classroom-1' });
  });
});
