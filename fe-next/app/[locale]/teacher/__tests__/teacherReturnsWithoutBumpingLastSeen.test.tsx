/**
 * Measurement-gap regression (audit 2026-10-31).
 *
 * A teacher who returns without bumping last_seen_at never hit useFriends.
 * Opening /[locale]/teacher (or education) must ping; an anonymous session must not.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const updateOnlineStatus = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/utils/friendsHeadToHead', () => ({ updateOnlineStatus }));
vi.mock('@/components/teacher/CheckoutReturnCapture', () => ({
  CheckoutReturnCapture: () => null,
}));

let auth: { isAuthenticated: boolean; loading: boolean; user: { id: string } | null };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

let pathname = '/en/teacher';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: vi.fn() }),
}));

import TeacherLayout from '../layout';
import EducationLayout from '../../education/layout';

describe('teacher who returns without bumping last_seen_at', () => {
  beforeEach(() => {
    updateOnlineStatus.mockClear();
    pathname = '/en/teacher';
    auth = { isAuthenticated: false, loading: false, user: null };
  });

  it('opens /en/teacher and the presence ping writes last_seen_at', async () => {
    auth = { isAuthenticated: true, loading: false, user: { id: 'teacher-1' } };
    render(
      <TeacherLayout>
        <span>teacher-page</span>
      </TeacherLayout>,
    );

    await waitFor(() => {
      expect(updateOnlineStatus).toHaveBeenCalledTimes(1);
    });
    expect(updateOnlineStatus).toHaveBeenCalledWith('teacher-1');
  });

  it('anonymous sessions produce no profiles write on teacher routes', async () => {
    const { rerender } = render(
      <TeacherLayout>
        <span>teacher-page</span>
      </TeacherLayout>,
    );
    pathname = '/es/education/for-schools';
    rerender(
      <EducationLayout>
        <span>education-page</span>
      </EducationLayout>,
    );

    await Promise.resolve();
    expect(updateOnlineStatus).not.toHaveBeenCalled();
  });
});
