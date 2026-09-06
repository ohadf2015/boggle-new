import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

/**
 * A student must never be parked on a spinner that cannot resolve.
 *
 * The hub waits for `profile` before deciding anything, and `if (!profile) return;`
 * leaves `isChecking` true forever. That wait is correct — bouncing a freshly
 * minted guest session is the bug it was written to avoid — but it had no
 * deadline. The guest join path reaches it directly: `waitForProfile` gives up
 * after 3s and joins anyway, and `AuthContext` has no retry to rescue it, so a
 * profile read that fails any way other than PGRST116 never sets `profile` and
 * never logs. Recurring pitfall class 4 feeding a spinner.
 *
 * After the deadline the student gets a titled error with a retry, not a wheel.
 */

const { mockUseAuth, mockPush } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => ({ classroomId: null }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loader" /> }));
vi.mock('@/components/student/StudentHubPlayZone', () => ({ StudentHubPlayZone: () => null }));
vi.mock('@/components/student/StudentHubProgressZone', () => ({ StudentHubProgressZone: () => null }));
vi.mock('@/components/student/StudentHubLearnZone', () => ({ StudentHubLearnZone: () => <div data-testid="hub" /> }));
vi.mock('@/components/student/ClassroomGameBanner', () => ({ ClassroomGameBanner: () => null }));
vi.mock('@/lib/education/studentDisplayName', () => ({ resolveStudentDisplayName: () => 'Maya' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('next/image', () => ({ __esModule: true, default: (p: Record<string, unknown>) => React.createElement('img', p as never) }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) => React.createElement('div', p, children as React.ReactNode) }),
}));

import StudentPageClient from '../PageClient';

describe('StudentPageClient — the spinner has a deadline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('shows a retry instead of spinning forever when the profile never resolves', () => {
    // GIVEN a signed-in student whose profile read silently returned nothing
    mockUseAuth.mockReturnValue({ user: { id: 'anon-1' }, profile: null, loading: false });
    render(<StudentPageClient />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();

    // WHEN the wait runs past its deadline
    act(() => { vi.advanceTimersByTime(12_000); });

    // THEN the student is told what happened and given a way out
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    expect(screen.getByText('student.profileStalled.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'student.profileStalled.retry' })).toBeInTheDocument();
  });

  it('never shows the error when the profile arrives in time', () => {
    // GIVEN a profile that resolves normally
    mockUseAuth.mockReturnValue({ user: { id: 'anon-1' }, profile: { id: 'anon-1', user_role: null }, loading: false });
    render(<StudentPageClient />);

    // WHEN time passes well beyond the deadline
    act(() => { vi.advanceTimersByTime(30_000); });

    // THEN the hub is there and no error was ever shown
    expect(screen.getByTestId('hub')).toBeInTheDocument();
    expect(screen.queryByText('student.profileStalled.title')).not.toBeInTheDocument();
  });
});
