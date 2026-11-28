import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/student/academy/AcademyHubView', () => ({
  AcademyHubView: (p: { classroomName: string | null; data: { lessons: unknown[] } }) => (
    <div data-testid="academy-hub">{`${p.classroomName}:${p.data.lessons.length}`}</div>
  ),
}));

import { StudentViewFrame } from '../TeacherStudentView';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const base = { userId: 'u1', classroomId: 'c1', classroomName: '7B English', lessons: [{ lessonId: 'l1', status: 'assigned' as const }], backHref: '/en/teacher/classroom/c1', error: false, onRetry: vi.fn(), t };

describe('StudentViewFrame', () => {
  it('Given a class with lessons, Then the teacher sees the real student academy for that class under a banner that names it and leads back', () => {
    render(<StudentViewFrame {...base} />);
    expect(screen.getByText('teacher.studentView.banner:{"name":"7B English"}')).toBeInTheDocument();
    expect(screen.getByTestId('academy-hub')).toHaveTextContent('7B English:1');
    expect(screen.getByTestId('student-view-back')).toHaveAttribute('href', '/en/teacher/classroom/c1');
  });

  it('Given the lessons failed to load, Then it says so with a retry instead of an empty map', () => {
    const onRetry = vi.fn();
    render(<StudentViewFrame {...base} error onRetry={onRetry} />);
    expect(screen.queryByTestId('academy-hub')).toBeNull();
    fireEvent.click(screen.getByTestId('student-view-retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});
