import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * The gate must not throw the teacher's work away every time auth blinks.
 *
 * `TeacherGate` returned a full-page loader whenever `isLoading` was true, which
 * **unmounts every child**. `useTeacherAccess.isLoading` is not a one-shot: it is
 * `authLoading || reqLoading || profileLoading`, and
 *
 *   - `reqLoading` flips back to true whenever the `user?.id` effect re-runs
 *     (`useTeacherAccess.ts:30-38`), and
 *   - `profileLoading` is `!!user && !profile`, true for any window where a
 *     TOKEN_REFRESHED / INITIAL_SESSION event has a user but not yet a profile.
 *
 * So mid-lesson the whole subtree below the gate was destroyed and rebuilt from
 * scratch. Observed live on 2026-09-05: the dashboard snapped back to the Play
 * tab and closed the open "Assign to Classroom" modal with no dialog, no toast
 * and no signal — it took several retries, racing the reset, to assign a lesson
 * at all. The same gate wraps `/education/classroom-game`, where it resets
 * `ClassroomGameLobby`'s `selectedLessonIds` to `[]` while `selectedClassroomId`
 * re-auto-selects from the fetch, leaving a Set Up Game screen whose classroom
 * still looks chosen and whose Preview button is disabled.
 *
 * The loader is right for the FIRST resolve and wrong for every one after it.
 */

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/en/teacher',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { TeacherGate } from '../TeacherGate';

/** Stands in for `activeTab` / an open modal / a half-filled wizard. */
function ChildWithState() {
  const [tab, setTab] = useState('play');
  return (
    <div>
      <span data-testid="tab">{tab}</span>
      <button type="button" onClick={() => setTab('prepare')}>go prepare</button>
    </div>
  );
}

describe('<TeacherGate> — the teacher\'s in-flight work survives an auth blip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps children mounted when loading returns after access was granted', () => {
    // GIVEN a teacher whose access has settled, working on the Prepare tab
    mockUseTeacherAccess.mockReturnValue({ hasAccess: true, status: 'approved', isLoading: false });
    const { rerender } = render(<TeacherGate><ChildWithState /></TeacherGate>);
    fireEvent.click(screen.getByText('go prepare'));
    expect(screen.getByTestId('tab')).toHaveTextContent('prepare');

    // WHEN a background refetch flips isLoading back to true
    mockUseTeacherAccess.mockReturnValue({ hasAccess: true, status: 'approved', isLoading: true });
    rerender(<TeacherGate><ChildWithState /></TeacherGate>);

    // THEN their tab is still where they left it — no unmount, no reset
    expect(screen.getByTestId('tab')).toHaveTextContent('prepare');
  });

  it('survives a transient null profile, where hasAccess itself goes false', () => {
    // GIVEN settled access
    mockUseTeacherAccess.mockReturnValue({ hasAccess: true, status: 'approved', isLoading: false });
    const { rerender } = render(<TeacherGate><ChildWithState /></TeacherGate>);
    fireEvent.click(screen.getByText('go prepare'));

    // WHEN a token refresh briefly leaves a user with no profile — the
    // `profileLoading` window, where hasAccess reads false but nothing is wrong
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    rerender(<TeacherGate><ChildWithState /></TeacherGate>);
    expect(screen.getByTestId('tab')).toHaveTextContent('prepare');

    // THEN it is still there once the blip clears
    mockUseTeacherAccess.mockReturnValue({ hasAccess: true, status: 'approved', isLoading: false });
    rerender(<TeacherGate><ChildWithState /></TeacherGate>);
    expect(screen.getByTestId('tab')).toHaveTextContent('prepare');
  });

  it('still shows the loader on the FIRST resolve, before access is known', () => {
    // GIVEN a cold load — nothing has been granted yet
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    render(<TeacherGate><ChildWithState /></TeacherGate>);

    // THEN the loader owns the screen, exactly as before
    expect(screen.queryByTestId('tab')).toBeNull();
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('still hides children when access is genuinely lost', () => {
    // GIVEN a teacher who had access
    mockUseTeacherAccess.mockReturnValue({ hasAccess: true, status: 'approved', isLoading: false });
    const { rerender } = render(<TeacherGate><ChildWithState /></TeacherGate>);
    expect(screen.getByTestId('tab')).toBeInTheDocument();

    // WHEN access is settled-and-gone (signed out, role revoked) — NOT a blip
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: false });
    rerender(<TeacherGate><ChildWithState /></TeacherGate>);

    // THEN the redirect branch still owns it; stickiness must not become a hole
    expect(screen.queryByTestId('tab')).toBeNull();
  });
});
