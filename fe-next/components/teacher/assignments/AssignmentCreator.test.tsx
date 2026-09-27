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
    t: (key: string) => key,
    language: 'en',
  })),
}));
// Free by default in every test; the cap-gate describe block overrides.
let proState = { hasPro: false, loading: false };
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(() => ({
    classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en' }],
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
const mockOnComplete = vi.fn();
const mockOnClose = vi.fn();

describe('AssignmentCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as jest.Mock).mockReturnValue({
      createAssignment: mockCreateAssignment,
    });
  });

  it('renders with type selector and lesson dropdown', () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('teacher.assignment.typeLabel')).toBeInTheDocument();
    expect(screen.getByText('teacher.assignment.practiceMode')).toBeInTheDocument();
    expect(screen.getByText('teacher.assignment.duelChallenge')).toBeInTheDocument();
  });

  it('allows selecting assignment type', () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const practiceButton = screen.getByText('teacher.assignment.practiceMode');
    const duelButton = screen.getByText('teacher.assignment.duelChallenge');

    fireEvent.click(practiceButton);
    expect(practiceButton.parentElement).toHaveClass('bg-neo-cyan');

    fireEvent.click(duelButton);
    expect(duelButton.parentElement).toHaveClass('bg-neo-pink');
  });

  it('disables create button when no lesson selected', () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const createButton = screen.getByText('teacher.assignment.create');
    expect(createButton).toBeDisabled();
  });

  it('calls createAssignment on submit with correct data', async () => {
    mockCreateAssignment.mockResolvedValue({ success: true });

    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Select type
    fireEvent.click(screen.getByText('teacher.assignment.practiceMode'));

    // Select lesson
    const lessonSelect = screen.getByRole('combobox');
    fireEvent.change(lessonSelect, { target: { value: 'lesson-1' } });

    // Open date picker
    const datePicker = screen.getByText('teacher.assignment.selectDate');
    fireEvent.click(datePicker);

    // Set due date using quick shortcut
    const tomorrowButton = screen.getByText('teacher.assignment.tomorrow');
    fireEvent.click(tomorrowButton);

    // Submit
    const createButton = screen.getByText('teacher.assignment.create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          classroom_id: 'classroom-1',
          lesson_id: 'lesson-1',
          assignment_type: 'practice',
        })
      );
    });

    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error toast on create failure', async () => {
    mockCreateAssignment.mockResolvedValue({ success: false, error: 'Test error' });

    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Select type and lesson
    fireEvent.click(screen.getByText('teacher.assignment.practiceMode'));
    const lessonSelect = screen.getByRole('combobox');
    fireEvent.change(lessonSelect, { target: { value: 'lesson-1' } });

    // Open date picker and select today
    const datePicker = screen.getByText('teacher.assignment.selectDate');
    fireEvent.click(datePicker);
    fireEvent.click(screen.getByText('teacher.assignment.today'));

    // Submit
    fireEvent.click(screen.getByText('teacher.assignment.create'));

    await waitFor(() => {
      expect(mockCreateAssignment).toHaveBeenCalled();
    });

    // Should not call onComplete/onClose on error
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});

describe('AssignmentCreator — free-tier assignment cap', () => {
  const threeAssignments = [
    { id: 'a1', classroom_id: 'classroom-1', lesson_id: 'lesson-1' },
    { id: 'a2', classroom_id: 'classroom-1', lesson_id: 'lesson-1' },
    { id: 'a3', classroom_id: 'classroom-1', lesson_id: 'lesson-1' },
  ];

  beforeEach(() => {
    proState = { hasPro: false, loading: false };
    (useAssignments as jest.Mock).mockReturnValue({
      createAssignment: mockCreateAssignment,
      assignments: threeAssignments,
    });
  });

  it('shows the upsell instead of the form when a free teacher is at the cap', () => {
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('assignment-limit-upsell')).toBeInTheDocument();
    expect(screen.queryByText('teacher.assignment.typeLabel')).toBeNull();
    // The upgrade path is the live checkout page, not a second checkout POST.
    expect(screen.getByRole('link', { name: 'teacher.subscription.upgradeNow' })).toHaveAttribute(
      'href',
      '/en/teacher/upgrade',
    );
    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });

  it('lets a Pro teacher past the cap', () => {
    proState = { hasPro: true, loading: false };
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTestId('assignment-limit-upsell')).toBeNull();
    expect(screen.getByText('teacher.assignment.typeLabel')).toBeInTheDocument();
  });

  it('keeps the form for a free teacher below the cap', () => {
    (useAssignments as jest.Mock).mockReturnValue({
      createAssignment: mockCreateAssignment,
      assignments: threeAssignments.slice(0, 2),
    });
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTestId('assignment-limit-upsell')).toBeNull();
    expect(screen.getByText('teacher.assignment.typeLabel')).toBeInTheDocument();
  });

  it('never gates while the entitlement is still loading', () => {
    proState = { hasPro: false, loading: true };
    render(
      <AssignmentCreator
        classroomId="classroom-1"
        onComplete={mockOnComplete}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByTestId('assignment-limit-upsell')).toBeNull();
  });
});
