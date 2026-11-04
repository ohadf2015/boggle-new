import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const updateOnlineStatus = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/utils/friendsHeadToHead', () => ({
  updateOnlineStatus,
}));

let auth: { isAuthenticated: boolean; loading: boolean; user: { id: string } | null };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

let pathname = '/en/teacher';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import { TeacherPresencePing } from '../TeacherPresencePing';

describe('TeacherPresencePing', () => {
  beforeEach(() => {
    updateOnlineStatus.mockClear();
    pathname = '/en/teacher';
    auth = { isAuthenticated: false, loading: false, user: null };
  });

  it('does not write last_seen_at for an anonymous visitor on /en/teacher', async () => {
    const { container } = render(<TeacherPresencePing />);
    await Promise.resolve();
    expect(updateOnlineStatus).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('does not write last_seen_at for an anonymous visitor on an education page', async () => {
    pathname = '/en/education/for-schools';
    render(<TeacherPresencePing />);
    await Promise.resolve();
    expect(updateOnlineStatus).not.toHaveBeenCalled();
  });

  it('does not write while the session is still resolving', async () => {
    auth = { isAuthenticated: false, loading: true, user: null };
    render(<TeacherPresencePing />);
    await Promise.resolve();
    expect(updateOnlineStatus).not.toHaveBeenCalled();
  });

  it('does not call updateOnlineStatus without a user id, even if the flag says authenticated', async () => {
    auth = { isAuthenticated: true, loading: false, user: null };
    render(<TeacherPresencePing />);
    await Promise.resolve();
    expect(updateOnlineStatus).not.toHaveBeenCalled();
  });

  it('bumps last_seen_at when an authenticated teacher opens /en/teacher', async () => {
    auth = { isAuthenticated: true, loading: false, user: { id: 'teacher-1' } };
    render(<TeacherPresencePing />);
    await waitFor(() => {
      expect(updateOnlineStatus).toHaveBeenCalledTimes(1);
    });
    expect(updateOnlineStatus).toHaveBeenCalledWith('teacher-1');
  });

  it('re-runs the throttled writer when the pathname changes inside the layout', async () => {
    auth = { isAuthenticated: true, loading: false, user: { id: 'teacher-1' } };
    const { rerender } = render(<TeacherPresencePing />);
    await waitFor(() => expect(updateOnlineStatus).toHaveBeenCalledTimes(1));

    pathname = '/es/teacher/classroom';
    rerender(<TeacherPresencePing />);
    await waitFor(() => expect(updateOnlineStatus).toHaveBeenCalledTimes(2));
    expect(updateOnlineStatus).toHaveBeenLastCalledWith('teacher-1');
  });
});
