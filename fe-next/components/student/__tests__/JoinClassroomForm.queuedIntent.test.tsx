import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * A queued JOIN must either fire or say what it is still waiting for.
 *
 * The form already holds a tap that lands before the session resolves and
 * replays it on ready — that half works. But the replay has a second guard: a
 * guest also needs a name. When the tap arrived before BOTH resolved, the queue
 * sat there indefinitely under a line reading "preparing", which is not what is
 * happening. The student has pressed JOIN, been told something is in progress,
 * and nothing will ever happen, because the form is waiting on them for a field
 * they were never asked about.
 *
 * That is recurring pitfall class 4 wearing a spinner: a wait with no end and no
 * ask reads exactly like the silent no-op it replaced. The pending state has to
 * name its actual blocker.
 */
const { mockJoin, mockPreview, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: Record<string, unknown>) => React.createElement('div', p as never, children as React.ReactNode) }),
}));
vi.mock('@/lib/education/classroomPreview', () => ({ lookupClassroomPreview: mockPreview }));

import JoinClassroomForm from '../JoinClassroomForm';

const submitForm = (container: HTMLElement) =>
  fireEvent.submit(container.querySelector('form') as HTMLFormElement);

describe('JoinClassroomForm — a queued JOIN never waits in silence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Flow Check', kind: 'classroom' });
  });

  it('asks a guest for their name instead of pretending to be busy', async () => {
    // GIVEN a guest who taps JOIN before the session resolves, and has not
    // given a name
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container, rerender } = render(<JoinClassroomForm initialCode="P45KRT" />);
    submitForm(container);

    // WHEN the session resolves and the replay runs into its second guard
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    rerender(<JoinClassroomForm initialCode="P45KRT" />);

    // THEN the student is told what is actually needed, not "preparing"
    await waitFor(() =>
      expect(screen.getByText('education.student.join.queuedNeedsName')).toBeInTheDocument()
    );
    expect(screen.queryByText('education.student.join.preparing')).not.toBeInTheDocument();
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('fires the held tap the moment the name arrives, with no second tap', async () => {
    // GIVEN that same held tap
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container, rerender } = render(<JoinClassroomForm initialCode="P45KRT" />);
    submitForm(container);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    rerender(<JoinClassroomForm initialCode="P45KRT" />);

    // WHEN the student types the name they were just asked for
    fireEvent.change(screen.getByLabelText('education.student.join.nameLabel'), {
      target: { value: 'Sam' },
    });

    // THEN their original tap is honoured
    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('P45KRT', { guestName: 'Sam' }));
    expect(screen.queryByText('education.student.join.queuedNeedsName')).not.toBeInTheDocument();
  });

  it('replays a signed-in student\'s held tap with no extra prompt', async () => {
    // GIVEN a signed-in student whose tap raced the session
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container, rerender } = render(<JoinClassroomForm initialCode="P45KRT" />);
    submitForm(container);

    // WHEN auth resolves to a real account — no name is needed from them
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, loading: false });
    rerender(<JoinClassroomForm initialCode="P45KRT" />);

    // THEN it just joins
    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('P45KRT', undefined));
    expect(screen.queryByText('education.student.join.queuedNeedsName')).not.toBeInTheDocument();
  });

  it('still shows the plain pending line while auth itself is the blocker', () => {
    // GIVEN a tap during the auth window
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = render(<JoinClassroomForm initialCode="P45KRT" />);
    submitForm(container);

    // THEN "preparing" is correct here — auth really is what we are waiting on
    expect(screen.getByText('education.student.join.preparing')).toBeInTheDocument();
    expect(screen.queryByText('education.student.join.queuedNeedsName')).not.toBeInTheDocument();
  });
});
