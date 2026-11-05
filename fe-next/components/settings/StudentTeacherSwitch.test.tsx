import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { refreshProfile, auth } = vi.hoisted(() => ({
  refreshProfile: vi.fn(async () => {}),
  auth: { current: { user: null as unknown, profile: null as unknown } },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ ...auth.current, refreshProfile }),
}));

import { StudentTeacherSwitch } from './StudentTeacherSwitch';

describe('StudentTeacherSwitch', () => {
  beforeEach(() => {
    refreshProfile.mockClear();
    auth.current = {
      user: { id: 'u1', email: 't@schools.nyc.gov', is_anonymous: false },
      profile: { user_role: 'student' },
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, user_role: 'teacher' }), { status: 200 })));
  });

  it('hides for a teacher and for a session with no profile', () => {
    auth.current = { user: { email: 't@school.edu' }, profile: { user_role: 'teacher' } };
    const { rerender } = render(<StudentTeacherSwitch isDarkMode />);
    expect(screen.queryByTestId('student-teacher-switch')).not.toBeInTheDocument();
    auth.current = { user: null, profile: null };
    rerender(<StudentTeacherSwitch isDarkMode />);
    expect(screen.queryByTestId('student-teacher-switch')).not.toBeInTheDocument();
  });

  it('promotes a student and points them at the classroom', async () => {
    render(<StudentTeacherSwitch isDarkMode />);
    fireEvent.click(screen.getByTestId('student-teacher-switch-cta'));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /Open your classroom/ })).toHaveAttribute('href', '/en/teacher');
  });

  it('tells an unconfirmed student to confirm before switching', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, code: 'UNCONFIRMED' }), { status: 403 })));
    render(<StudentTeacherSwitch isDarkMode />);
    fireEvent.click(screen.getByTestId('student-teacher-switch-cta'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirm your email first');
  });
});
