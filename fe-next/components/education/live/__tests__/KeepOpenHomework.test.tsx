import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const createAssignment = vi.fn();
const assignments = { list: [] as Array<{ lesson_id: string; due_date: string | null }>, isLoading: false };
const user = { current: { id: 'teacher-1' } as { id: string } | null };
const capture = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: user.current }) }));
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({ assignments: assignments.list, isLoading: assignments.isLoading, createAssignment }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: (...a: unknown[]) => capture(...a) }));

import { KeepOpenHomework } from '../KeepOpenHomework';
import { localDayPlus } from '@/components/teacher/assignments/AssignmentCreatorDueDate';

const K = 'eduLiveRoom.hostResults.keepOpen';

beforeEach(() => {
  createAssignment.mockReset();
  capture.mockReset();
  assignments.list = [];
  assignments.isLoading = false;
  user.current = { id: 'teacher-1' };
});
afterEach(cleanup);

describe('<KeepOpenHomework>', () => {
  it('Given no homework for this lesson, When the teacher taps keep open, Then it assigns the lesson to the class for a week and says until when', async () => {
    createAssignment.mockResolvedValue({ success: true });
    render(<KeepOpenHomework classroomId="class-1" lessonId="lesson-1" />);
    fireEvent.click(screen.getByTestId('keep-open-homework'));
    await waitFor(() => expect(screen.getByTestId('keep-open-done')).toBeInTheDocument());
    expect(createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ classroom_id: 'class-1', lesson_id: 'lesson-1', teacher_id: 'teacher-1', assignment_type: 'practice', due_date: localDayPlus(7) }),
    );
    expect(screen.getByTestId('keep-open-done')).toHaveTextContent(`${K}.done`);
    expect(capture).toHaveBeenCalledWith('edu_homework_kept_open', expect.objectContaining({ outcome: 'created', surface: 'host_results' }));
  });

  it('Given the lesson is already open homework, Then it shows the open state and no button', () => {
    assignments.list = [{ lesson_id: 'lesson-1', due_date: localDayPlus(3) }];
    render(<KeepOpenHomework classroomId="class-1" lessonId="lesson-1" />);
    expect(screen.queryByTestId('keep-open-homework')).not.toBeInTheDocument();
    expect(screen.getByTestId('keep-open-done')).toBeInTheDocument();
  });

  it('Given the free plan has no assignment left, When tapped, Then it explains the limit instead of failing silently', async () => {
    createAssignment.mockResolvedValue({ success: false, error: 'ASSIGNMENT_LIMIT_REACHED' });
    render(<KeepOpenHomework classroomId="class-1" lessonId="lesson-1" />);
    fireEvent.click(screen.getByTestId('keep-open-homework'));
    await waitFor(() => expect(screen.getByTestId('keep-open-note')).toHaveTextContent(`${K}.limit`));
    expect(screen.getByTestId('keep-open-homework')).toBeInTheDocument();
  });

  it('Given the save fails, When tapped, Then it says so and the button stays to retry', async () => {
    createAssignment.mockResolvedValue({ success: false, error: 'boom' });
    render(<KeepOpenHomework classroomId="class-1" lessonId="lesson-1" />);
    fireEvent.click(screen.getByTestId('keep-open-homework'));
    await waitFor(() => expect(screen.getByTestId('keep-open-note')).toHaveTextContent(`${K}.failed`));
  });

  it('Given an existing assignment re-saved with a new week, Then it reads as open', async () => {
    createAssignment.mockResolvedValue({ success: true, alreadyAssigned: true });
    render(<KeepOpenHomework classroomId="class-1" lessonId="lesson-1" />);
    fireEvent.click(screen.getByTestId('keep-open-homework'));
    await waitFor(() => expect(screen.getByTestId('keep-open-done')).toBeInTheDocument());
  });

  it('Given no signed-in teacher, Then it renders nothing', () => {
    user.current = null;
    const { container } = render(<KeepOpenHomework classroomId="class-1" lessonId="lesson-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
