import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * ONE tap of JOIN must join the class.
 *
 * The reported failure (critic-flowfix-r2, 5/5 fresh guests): a student types a
 * unique nickname, taps JOIN once, sees "JOINING…", and the form silently
 * reverts to a bare class-code field with the name input gone from the DOM. No
 * error, no toast, no navigation. A second, undocumented tap is required.
 *
 * The network trace named the cause exactly: a hard-reload `Document` GET of
 * `/en/join/<code>` sandwiched between the guest-name precheck and the
 * `classroom/join` POST. That reload is `useAuthInitialization`'s
 * `joinClassroomReturnCode` redirect firing on the ANONYMOUS session that
 * `signInAsGuestStudent` mints for this very join — see
 * `contexts/auth/pendingJoinRedirect.ts`, which now refuses it, and
 * `contexts/auth/__tests__/pendingJoinRedirect.test.ts`.
 *
 * This test guards the form's half of that contract: the first submit reaches
 * `joinClassroom` and navigates. It cannot observe the document reload (that
 * lives in the auth provider), so the two test files are the pair — neither is
 * sufficient alone.
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

describe('JoinClassroomForm — the first tap joins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Flow Check', kind: 'classroom' });
    // A guest whose session has already settled — the ordinary case, and the
    // one the critic tested. Nothing here is racing.
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('sends the join on the FIRST submit and navigates, with no second tap', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    const { container } = render(<JoinClassroomForm initialCode="P45KRT" />);

    // GIVEN a unique nickname typed into the guest name field
    const nameInput = await screen.findByLabelText(/nameLabel/i);
    fireEvent.change(nameInput, { target: { value: 'ProbeNoa' } });

    // WHEN the student taps JOIN exactly once
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    // THEN the join fires with their name, once, and takes them onward.
    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
    expect(mockJoin).toHaveBeenCalledWith('P45KRT', { guestName: 'ProbeNoa' });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/student'));
  });

  it('walks a student straight into the room when the code was a LIVE GAME code', async () => {
    // A student who typed the projector's code came to play, not to enrol.
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1', gameCode: 'JATS5Z' });
    const { container } = render(<JoinClassroomForm initialCode="JATS5Z" />);

    const nameInput = await screen.findByLabelText(/nameLabel/i);
    fireEvent.change(nameInput, { target: { value: 'ProbeNoa' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=JATS5Z&classroom=true')
    );
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });
});
