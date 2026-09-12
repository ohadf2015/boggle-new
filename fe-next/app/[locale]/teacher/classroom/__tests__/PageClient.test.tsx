/**
 * Teacher Classes PageClient — the route the nav shell's "Classes" tab links
 * to. It is a thin wrapper: `ClassroomManager` already owns the whole
 * create/edit/roster surface (used inside the dashboard too), so this test
 * only checks the wiring — gate, shell, and that the manager actually mounts.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ClassroomsPageClient from '../PageClient';

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: () => <div data-testid="classroom-manager-mock">Classroom Manager Mock</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, isAuthenticated: true, isAdmin: false, loading: false }),
}));

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/teacher/classroom',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('TeacherClassroomsPage', () => {
  it('renders the classroom manager once the teacher gate is settled', () => {
    render(<ClassroomsPageClient />);
    expect(screen.getByTestId('classroom-manager-mock')).toBeInTheDocument();
  });

  it('mounts inside the education shell, with the Classes tab active', () => {
    render(<ClassroomsPageClient />);
    expect(screen.getByTestId('education-tab-classes').getAttribute('aria-current')).toBe('page');
  });
});
