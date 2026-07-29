/**
 * QuickPlayPanel Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickPlayPanel from './QuickPlayPanel';

// Mock dependencies
const mockPush = vi.fn();
const mockT = vi.fn((key) => key);

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
  }),
}));

vi.mock('@/hooks/useStudentProgress', () => ({
  useStudentProgress: vi.fn(() => ({
    lessons: [],
    isLoading: false,
  })),
}));

// Import after mocks
import { useStudentProgress } from '@/hooks/useStudentProgress';

describe('QuickPlayPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders two action buttons', () => {
    render(<QuickPlayPanel classroomId="class-1" userId="user-1" />);

    expect(screen.getByText('student.dashboard.quickPractice')).toBeInTheDocument();
    expect(screen.getByText('student.dashboard.quickDuel')).toBeInTheDocument();
  });

  it('disables Quick Practice button when no lessons available', () => {
    (useStudentProgress as jest.Mock).mockReturnValue({
      lessons: [],
      isLoading: false,
    });

    render(<QuickPlayPanel classroomId="class-1" userId="user-1" />);

    const practiceButton = screen.getByText('student.dashboard.quickPractice').closest('button');
    expect(practiceButton).toBeDisabled();
  });

  it('enables Quick Practice button when lessons available', () => {
    (useStudentProgress as jest.Mock).mockReturnValue({
      lessons: [
        { lessonId: 'lesson-1', status: 'assigned' },
        { lessonId: 'lesson-2', status: 'started' },
      ],
      isLoading: false,
    });

    render(<QuickPlayPanel classroomId="class-1" userId="user-1" />);

    const practiceButton = screen.getByText('student.dashboard.quickPractice').closest('button');
    expect(practiceButton).not.toBeDisabled();
  });

  it('navigates to random lesson on Quick Practice click', async () => {
    (useStudentProgress as jest.Mock).mockReturnValue({
      lessons: [
        { lessonId: 'lesson-1', status: 'assigned' },
        { lessonId: 'lesson-2', status: 'started' },
      ],
      isLoading: false,
    });

    render(<QuickPlayPanel classroomId="class-1" userId="user-1" />);

    const practiceButton = screen.getByText('student.dashboard.quickPractice').closest('button');
    fireEvent.click(practiceButton!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\/en\/student\/lessons\/(lesson-1|lesson-2)/));
    });
  });

  it('Quick Duel button is always enabled', () => {
    render(<QuickPlayPanel classroomId="class-1" userId="user-1" />);

    const duelButton = screen.getByText('student.dashboard.quickDuel').closest('button');
    expect(duelButton).not.toBeDisabled();
  });

  it('navigates to duel lobby on Quick Duel click', () => {
    render(<QuickPlayPanel classroomId="class-1" userId="user-1" />);

    const duelButton = screen.getByText('student.dashboard.quickDuel').closest('button');
    fireEvent.click(duelButton!);

    expect(mockPush).toHaveBeenCalledWith('/en/education/duels?classroomId=class-1');
  });

  it('shows loading spinner while navigating', async () => {
    (useStudentProgress as jest.Mock).mockReturnValue({
      lessons: [{ lessonId: 'lesson-1', status: 'assigned' }],
      isLoading: false,
    });

    render(<QuickPlayPanel classroomId="class-1" userId="user-1" />);

    const practiceButton = screen.getByText('student.dashboard.quickPractice').closest('button');
    fireEvent.click(practiceButton!);

    // Button should be disabled during navigation
    expect(practiceButton).toBeDisabled();
  });
});
