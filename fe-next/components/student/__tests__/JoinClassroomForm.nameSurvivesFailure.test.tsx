import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * The name field must survive a failed join.
 *
 * `joinClassroom` mints an ANONYMOUS auth user before it calls the join route
 * (hooks/useClassroom.ts — the guest identity is needed for the server to
 * identify the student). So the moment a guest taps JOIN, `user` stops being
 * null — permanently, whether the join then succeeded or not.
 *
 * The field was rendered on `isGuest = !user`, so a wrong code made the whole
 * "YOUR NAME" row disappear on the retry. The student corrects the code, sees
 * only CLASS CODE + JOIN, and has no idea which name is about to be submitted.
 * Reproduced in the 2026-09-07 flow audit (audit-studentjoin-05/06).
 */
const { mockJoin, mockPreview, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}:${JSON.stringify(params)}` : k,
    dir: 'ltr',
    language: 'en',
  }),
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

const nameInput = () => screen.queryByLabelText('education.student.join.nameLabel');
const joinButton = () => screen.getByRole('button', { name: /education\.student\.join\.button/i });

describe('JoinClassroomForm — the guest session the form itself created', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreview.mockResolvedValue(null);
  });

  it('keeps the name field after a bad code mints a guest session', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockJoin.mockResolvedValue({ success: false, code: 'INVALID_CODE' });

    const { rerender } = render(<JoinClassroomForm initialCode="BADCOD" />);
    expect(nameInput()).toBeInTheDocument();
    fireEvent.change(nameInput()!, { target: { value: 'Priya' } });
    fireEvent.click(joinButton());
    await waitFor(() => expect(mockJoin).toHaveBeenCalled());

    // The anonymous user now exists — the join attempt created it.
    mockUseAuth.mockReturnValue({ user: { id: 'anon-1' }, loading: false });
    rerender(<JoinClassroomForm initialCode="BADCOD" />);

    expect(nameInput()).toBeInTheDocument();
    expect(nameInput()).toHaveValue('Priya');
  });

  it('still asks a signed-in student for nothing', () => {
    // A real student account arrives already named. Nobody should be asked.
    mockUseAuth.mockReturnValue({ user: { id: 'student-1' }, loading: false });
    render(<JoinClassroomForm initialCode="P45KRT" />);
    expect(nameInput()).not.toBeInTheDocument();
  });
});
