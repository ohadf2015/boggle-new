import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * The first tap on JOIN must never be a no-op.
 *
 * Observed live on 2026-09-05 at `/join/UY6W8L`: a guest filled in a name,
 * tapped JOIN, and nothing happened — no navigation, no error, and no
 * `POST /api/education/classroom/join` in the network log. A reload and a
 * SECOND tap completed the join. That is the "nothing happens, try again"
 * shape that reads as broken.
 *
 * The window is auth: this form derives `isGuest` from `!user` alone, ignoring
 * `loading`, so while the session is still resolving the form is already
 * rendering its guest branch and already accepting taps — against state that is
 * about to change underneath it (recurring pitfall class 1, and class 4 for
 * producing nothing when it goes wrong).
 *
 * `isGuest` deliberately stays `!user`. Folding `loading` into it would INVERT
 * the polarity of the guards that depend on it — the name field is UI *added*
 * for guests, and `disabled={... || (isGuest && !name.trim())}` needs `isGuest`
 * true to require a name. An `isGuest` that reads false while loading would hide
 * the name field AND enable the button with an empty name. Unresolved auth is
 * its own third state instead.
 */
const { mockJoin, mockPreview, mockUseAuth, mockPush, mockToastError } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: mockToastError } }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: Record<string, unknown>) => React.createElement('div', p as never, children as React.ReactNode) }),
}));
vi.mock('@/lib/education/classroomPreview', () => ({ lookupClassroomPreview: mockPreview }));

import JoinClassroomForm from '../JoinClassroomForm';

const joinButton = () => screen.getByRole('button', { name: /education\.student\.join\.button/i });
const codeInput = () => screen.getByLabelText('education.student.join.codeLabel');

describe('JoinClassroomForm — JOIN is never a silent no-op', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'ELA Period 3', language: 'en' });
  });

  it('disables JOIN while the session is still resolving, and says why', () => {
    // GIVEN a first visit where auth has not resolved yet
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<JoinClassroomForm initialCode="UY6W8L" />);

    // THEN the button is not silently tappable, and the reason is on screen
    expect(joinButton()).toBeDisabled();
    expect(screen.getByText('education.student.join.preparing')).toBeInTheDocument();
  });

  it('enables JOIN as soon as the session resolves to a guest', async () => {
    // GIVEN auth resolving from loading to logged-out
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { rerender } = render(<JoinClassroomForm initialCode="UY6W8L" />);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    rerender(<JoinClassroomForm initialCode="UY6W8L" />);

    // WHEN the guest gives their name
    fireEvent.change(screen.getByLabelText('education.student.join.nameLabel'), {
      target: { value: 'Maya' },
    });

    // THEN the button is live and the waiting message is gone
    expect(joinButton()).not.toBeDisabled();
    expect(screen.queryByText('education.student.join.preparing')).not.toBeInTheDocument();
  });

  it('never submits silently if a tap lands before auth resolves', async () => {
    // GIVEN a form whose auth is still unresolved
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = render(<JoinClassroomForm initialCode="UY6W8L" />);

    // WHEN a submit reaches the handler anyway (Enter key, a tap racing the
    // re-render — exactly the live repro)
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    // THEN no half-formed join is fired, and the tap is not thrown away: it is
    // held with a visible pending line and replayed on ready (see
    // JoinClassroomForm.firstTap). Queuing beats a toast — the student pressed
    // the button and should not have to press it again.
    expect(mockJoin).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText('education.student.join.preparing')).toBeInTheDocument()
    );
  });

  it('still joins normally once everything has resolved', async () => {
    // GIVEN a resolved guest session with a name
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<JoinClassroomForm />);
    fireEvent.change(codeInput(), { target: { value: 'UY6W8L' } });
    fireEvent.change(screen.getByLabelText('education.student.join.nameLabel'), {
      target: { value: 'Maya' },
    });

    // WHEN they tap JOIN
    fireEvent.click(joinButton());

    // THEN the join actually fires on the FIRST tap
    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('UY6W8L', { guestName: 'Maya' }));
  });
});
