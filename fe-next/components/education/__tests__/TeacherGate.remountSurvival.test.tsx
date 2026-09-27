import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * "This teacher has access" must outlive the gate component itself.
 *
 * The sticky-once fact lived in `grantedRef` — a `useRef`, so it belongs to one
 * INSTANCE of TeacherGate. Anything that remounts the gate resets it to false:
 * a segment error boundary recovering, a parent re-keying, a route group
 * remount. The very next `isLoading` blip after that then takes the full-page
 * loader again and tears the whole dashboard down — the exact failure the ref
 * was added to prevent, just one remount later. Recurring pitfall class 1: the
 * durable fact was being kept somewhere less durable than the thing it guards.
 *
 * Hoisting it to module scope, keyed by user id, is what makes it survive.
 * Keyed matters: an unkeyed flag would hand the next person to use the device —
 * a student on a shared laptop after the teacher signs out — a teacher gate
 * that has already decided to let them through.
 *
 * NOTE ON THE ASSERTION: a genuine remount unmounts children by definition, so
 * "the child never unmounts across a remount" is not a thing any fix can
 * deliver. The two halves are tested separately — no unmount WITHIN a mounted
 * gate, and no loader (so no second teardown) on the first paint AFTER one.
 */

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => '/en/teacher',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { TeacherGate, __resetTeacherGrantsForTests } from '../TeacherGate';

const TEACHER = { id: 'teacher-1' };
const OTHER_TEACHER = { id: 'teacher-2' };

const onUnmount = vi.fn();
/** Stands in for the dashboard: an open modal, a chosen tab, a half-filled form. */
function DashboardChild() {
  React.useEffect(() => onUnmount, []);
  return <div data-testid="dashboard">dashboard</div>;
}

function access(hasAccess: boolean, isLoading: boolean) {
  mockUseTeacherAccess.mockReturnValue({ hasAccess, isLoading });
}

describe('<TeacherGate> — the grant survives a remount of the gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTeacherGrantsForTests();
    mockUseAuth.mockReturnValue({ user: TEACHER });
  });

  it('does not unmount children when the loading flags flip twice inside one mount', () => {
    // GIVEN a teacher whose access has resolved
    access(true, false);
    const { rerender } = render(<TeacherGate><DashboardChild /></TeacherGate>);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();

    // WHEN a background refetch flips isLoading on and off, twice
    for (let i = 0; i < 2; i++) {
      access(true, true);
      rerender(<TeacherGate><DashboardChild /></TeacherGate>);
      access(true, false);
      rerender(<TeacherGate><DashboardChild /></TeacherGate>);
    }

    // THEN the dashboard was never torn down
    expect(onUnmount).not.toHaveBeenCalled();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders children with no loader on the first paint after the gate remounts', () => {
    // GIVEN a teacher who has already been granted access once
    access(true, false);
    const first = render(<TeacherGate><DashboardChild /></TeacherGate>);
    first.unmount();

    // WHEN the gate remounts — an error-boundary reset, a re-keyed parent —
    // while a refetch happens to be in flight
    access(true, true);
    render(<TeacherGate><DashboardChild /></TeacherGate>);

    // THEN the teacher sees their dashboard, not the full-page loader that
    // would destroy it all over again
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
  });

  it('holds the grant through a remount that lands while the user is momentarily null', () => {
    // GIVEN a granted teacher
    access(true, false);
    const first = render(<TeacherGate><DashboardChild /></TeacherGate>);
    first.unmount();

    // WHEN the gate remounts during an auth re-init — `user` reads null and
    // `isLoading` is true, the same churn window the critic hit. Treating that
    // transient null as a sign-out would wipe the grant and take the loader,
    // which is the exact teardown this whole fix exists to prevent.
    mockUseAuth.mockReturnValue({ user: null });
    access(true, true);
    render(<TeacherGate><DashboardChild /></TeacherGate>);

    // THEN the teacher keeps their screen
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
  });

  it('still shows the loader on a genuine first visit', () => {
    // GIVEN a teacher nobody has granted anything to yet
    access(false, true);

    // WHEN the gate mounts while access is unresolved
    render(<TeacherGate><DashboardChild /></TeacherGate>);

    // THEN they wait. Optimism here is what shows a stranger the dashboard.
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('redirects a teacher whose access is revoked, remembered grant or not', () => {
    // GIVEN a teacher who had access
    access(true, false);
    const first = render(<TeacherGate><DashboardChild /></TeacherGate>);
    first.unmount();

    // WHEN access comes back settled and denied
    access(false, false);
    render(<TeacherGate><DashboardChild /></TeacherGate>);

    // THEN the remembered grant does not keep them in
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('/en/education/access')
    );
  });

  it('does not lend one teacher\'s grant to the next person on the device', () => {
    // GIVEN a teacher who was granted access, then signed out
    access(true, false);
    const first = render(<TeacherGate><DashboardChild /></TeacherGate>);
    first.unmount();
    mockUseAuth.mockReturnValue({ user: null });

    // WHEN somebody else signs in on the same device and their access is still
    // resolving
    mockUseAuth.mockReturnValue({ user: OTHER_TEACHER });
    access(false, true);
    render(<TeacherGate><DashboardChild /></TeacherGate>);

    // THEN they wait for their OWN answer
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('forgets the grant on sign-out', () => {
    // GIVEN a granted teacher who signs out
    access(true, false);
    const first = render(<TeacherGate><DashboardChild /></TeacherGate>);
    mockUseAuth.mockReturnValue({ user: null });
    access(false, false);
    first.rerender(<TeacherGate><DashboardChild /></TeacherGate>);
    first.unmount();

    // WHEN the same account signs back in and access is still resolving
    mockUseAuth.mockReturnValue({ user: TEACHER });
    access(false, true);
    render(<TeacherGate><DashboardChild /></TeacherGate>);

    // THEN nothing is assumed. A signed-out session ends the grant.
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });
});
