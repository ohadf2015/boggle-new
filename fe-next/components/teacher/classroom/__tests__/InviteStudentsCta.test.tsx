import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InviteStudentsCta } from '../InviteStudentsCta';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : _key),
    language: 'en',
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn(async () => 'copied'),
}));

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => capture(...args), register: vi.fn(), __loaded: true },
}));

describe('InviteStudentsCta — empty-roster invite CTA', () => {
  beforeEach(() => {
    capture.mockClear();
  });

  it('Given 0 students, Then the Invite students CTA renders with the join code', () => {
    render(
      <InviteStudentsCta classroomId="class-1" joinCode="AB12CD" studentCount={0} />,
    );
    const cta = screen.getByTestId('teacher-invite-students-cta');
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveTextContent('Invite students');
    expect(screen.getByTestId('invite-students-join-code')).toHaveTextContent('AB12CD');
    expect(screen.getByTestId('invite-students-copy-link')).toBeInTheDocument();
    expect(screen.getByTestId('invite-students-share')).toBeInTheDocument();
    expect(capture).toHaveBeenCalledWith('teacher_invite_students_cta_viewed', {
      classroom_id: 'class-1',
    });
  });

  it('Given 1+ students, Then the empty-state CTA is hidden', () => {
    render(
      <InviteStudentsCta classroomId="class-1" joinCode="AB12CD" studentCount={1} />,
    );
    expect(screen.queryByTestId('teacher-invite-students-cta')).not.toBeInTheDocument();
    expect(capture).not.toHaveBeenCalled();
  });

  it('When the CTA is tapped, Then it fires teacher_invite_students_cta_clicked', () => {
    render(
      <InviteStudentsCta classroomId="class-1" joinCode="AB12CD" studentCount={0} />,
    );
    fireEvent.click(screen.getByTestId('teacher-invite-students-cta'));
    expect(capture).toHaveBeenCalledWith('teacher_invite_students_cta_clicked', {
      classroom_id: 'class-1',
    });
  });
});
