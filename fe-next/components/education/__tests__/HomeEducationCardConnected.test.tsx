import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const cg = { isOnCrazyGamesPlatform: false, isLoading: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

const storedSession = { value: false };
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => storedSession.value }));

const useAuthMock = vi.fn();
const useTeacherAccessMock = vi.fn();
const useStudentClassroomMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => useTeacherAccessMock(),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => useStudentClassroomMock(),
}));

import { HomeEducationCardConnected } from '../HomeEducationCardConnected';

const auth = (over: Record<string, unknown> = {}) => ({
  isAuthenticated: true,
  isTeacher: false,
  isAdmin: false,
  loading: false,
  ...over,
});

const teacherAccess = (over: Record<string, unknown> = {}) => ({
  hasAccess: false,
  status: 'none',
  latestRequest: null,
  trial: null,
  isLoading: false,
  ...over,
});

const studentClassroom = (over: Record<string, unknown> = {}) => ({
  classroom: null,
  classroomId: null,
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  ...over,
});

describe('HomeEducationCardConnected', () => {
  beforeEach(() => {
    cg.isOnCrazyGamesPlatform = false;
    storedSession.value = false;
    localStorage.clear();
    useAuthMock.mockReset();
    useTeacherAccessMock.mockReset();
    useStudentClassroomMock.mockReset();
    useTeacherAccessMock.mockReturnValue(teacherAccess());
    useStudentClassroomMock.mockReturnValue(studentClassroom());
  });

  // Promo branch: guests and unenrolled players always see the education entry
  // so classroom mode is discoverable on every homepage visit.
  it('promotes education to a signed-out visitor', () => {
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false }));
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/education');
  });

  // The returning home no longer has a classroom hero at any width, so the promo
  // is the only education entry there: it shows on desktop too (was phones only).
  it('shows the promo at every width, not phones only', () => {
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false }));
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card').closest('.md\\:hidden')).toBeNull();
  });

  it('gives students a direct "join with a code" link next to the teacher pitch', () => {
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false }));
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-join')).toHaveAttribute('href', '/en/join');
    expect(screen.getByTestId('home-education-subtitle')).toHaveTextContent('education.home.promo_line');
  });

  it('hides the promo inside CrazyGames so the embed never links off-platform', () => {
    cg.isOnCrazyGamesPlatform = true;
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false }));
    const { container } = render(<HomeEducationCardConnected />);
    expect(container.firstChild).toBeNull();
  });

  // On a player's phone home the promo led the page, above their own greeting.
  // It drops to the end of the hub (CSS order: no JS branch, and the late ssr:false
  // mount no longer shoves the hub down).
  it('puts the promo after the player hub, not above it', () => {
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false }));
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card').closest('.order-last')).not.toBeNull();
  });

  it('promotes education to an authed user with no classroom membership', () => {
    useAuthMock.mockReturnValue(auth());
    useStudentClassroomMock.mockReturnValue(studentClassroom());
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/education');
  });

  it('keeps promoting education on later visits', () => {
    localStorage.setItem('edu_home_promo_seen_v1', '1');
    useAuthMock.mockReturnValue(auth());
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/education');
  });

  it('does not write a one-shot seen marker', () => {
    useAuthMock.mockReturnValue(auth());
    render(<HomeEducationCardConnected />);
    expect(localStorage.getItem('edu_home_promo_seen_v1')).toBeNull();
  });

  it('promotes education straight away to a visitor with no stored session, even before auth resolves', () => {
    // The homepage defers auth until the first tap; no session = certainly a guest.
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false, loading: true }));
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/education');
  });

  it('renders nothing while auth is still resolving for a visitor holding a session', () => {
    storedSession.value = true;
    // isAuthenticated starts false — without the loading gate this frame shows the guest promo
    // to a signed-in teacher.
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false, loading: true }));
    const { container } = render(<HomeEducationCardConnected />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while the classroom lookup is still in flight', () => {
    useAuthMock.mockReturnValue(auth());
    useStudentClassroomMock.mockReturnValue(studentClassroom({ isLoading: true }));
    const { container } = render(<HomeEducationCardConnected />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the teacher card (with trial countdown) for a teacher', () => {
    useAuthMock.mockReturnValue(auth({ isTeacher: true }));
    useTeacherAccessMock.mockReturnValue(
      teacherAccess({
        hasAccess: true,
        trial: {
          expiresAt: new Date().toISOString(),
          msLeft: 5 * 86400000,
          daysLeft: 5,
          hoursLeft: 120,
          isExpired: false,
          isUrgent: false,
        },
      })
    );
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/teacher');
    expect(screen.getByTestId('home-education-trial-count')).toHaveTextContent('5');
  });

  it('renders the teacher card for an admin even without a teacher role', () => {
    useAuthMock.mockReturnValue(auth({ isAdmin: true }));
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/teacher');
  });

  it('renders the student card for a classroom member who is not a teacher', () => {
    useAuthMock.mockReturnValue(auth());
    useStudentClassroomMock.mockReturnValue(
      studentClassroom({ classroomId: 'c1', classroom: { id: 'c1', name: 'Room 12' } })
    );
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/student');
    expect(screen.getByTestId('home-education-subtitle')).toHaveTextContent('Room 12');
  });
});
