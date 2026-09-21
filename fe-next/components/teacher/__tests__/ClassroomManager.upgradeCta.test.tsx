/**
 * Classrooms-list header: "Upgrade to Teacher Pro" for an approved teacher
 * on an active trial. Hits the existing Polar checkout route; billing is
 * untouched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [
      {
        id: 'cls-1',
        name: 'Period 3',
        language: 'en',
        teacher_id: 'user1',
        join_code: 'ABC123',
        created_at: '2026-08-26',
        member_count: 0,
      },
    ],
    isLoading: false,
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const accessState: {
  trial: { isExpired: boolean; daysLeft: number } | null;
  isLoading: boolean;
} = {
  trial: null,
  isLoading: false,
};
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({
    hasAccess: true,
    status: 'approved',
    latestRequest: null,
    trial: accessState.trial,
    isLoading: accessState.isLoading,
  }),
}));

const proState: { hasPro: boolean; loading: boolean } = { hasPro: false, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({
    hasPro: proState.hasPro,
    loading: proState.loading,
    source: 'polar',
    periodEnd: null,
    grant: null,
    grantExpired: false,
    refresh: vi.fn(),
  }),
}));

import ClassroomManager from '../ClassroomManager';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';

describe('ClassroomManager header upgrade CTA', () => {
  beforeEach(() => {
    accessState.trial = null;
    accessState.isLoading = false;
    proState.hasPro = false;
    proState.loading = false;
  });

  it('links eligible active-trial teachers to Polar checkout', () => {
    accessState.trial = { isExpired: false, daysLeft: 10 };
    render(<ClassroomManager />);
    const cta = screen.getByTestId('classrooms-upgrade-teacher-pro');
    expect(cta).toHaveAttribute('href', `/en${TEACHER_PRO_CHECKOUT_PATH}`);
    expect(cta).toHaveTextContent('Upgrade to Teacher Pro');
  });

  it('still offers the CTA inside the 7-day banner window', () => {
    accessState.trial = { isExpired: false, daysLeft: 3 };
    render(<ClassroomManager />);
    expect(screen.getByTestId('classrooms-upgrade-teacher-pro')).toBeInTheDocument();
  });

  it('hides the CTA for Pro, loading, expired, or no-trial teachers', () => {
    accessState.trial = { isExpired: false, daysLeft: 10 };
    proState.hasPro = true;
    const { unmount } = render(<ClassroomManager />);
    expect(screen.queryByTestId('classrooms-upgrade-teacher-pro')).toBeNull();
    unmount();

    proState.hasPro = false;
    proState.loading = true;
    const second = render(<ClassroomManager />);
    expect(screen.queryByTestId('classrooms-upgrade-teacher-pro')).toBeNull();
    second.unmount();

    proState.loading = false;
    accessState.isLoading = true;
    const third = render(<ClassroomManager />);
    expect(screen.queryByTestId('classrooms-upgrade-teacher-pro')).toBeNull();
    third.unmount();

    accessState.isLoading = false;
    accessState.trial = { isExpired: true, daysLeft: 0 };
    const fourth = render(<ClassroomManager />);
    expect(screen.queryByTestId('classrooms-upgrade-teacher-pro')).toBeNull();
    fourth.unmount();

    accessState.trial = null;
    render(<ClassroomManager />);
    expect(screen.queryByTestId('classrooms-upgrade-teacher-pro')).toBeNull();
  });
});
