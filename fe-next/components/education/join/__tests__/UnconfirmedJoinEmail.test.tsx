import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { resend, updateUser } = vi.hoisted(() => ({
  resend: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/lib/supabase', () => ({ resendEmailVerification: (...args: unknown[]) => resend(...args) }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { updateUser } }),
}));

import { UnconfirmedJoinEmail } from '../UnconfirmedJoinEmail';

describe('UnconfirmedJoinEmail', () => {
  beforeEach(() => {
    resend.mockReset();
    updateUser.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('stays a link until the student asks, so guest join is not blocked', () => {
    render(<UnconfirmedJoinEmail joinCode="AB12CD" />);
    expect(screen.queryByTestId('join-unconfirmed-panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('join-unconfirmed-open'));
    expect(screen.getByTestId('join-unconfirmed-panel')).toBeInTheDocument();
  });

  it('resends to the address they typed and remembers the class code', async () => {
    resend.mockResolvedValue({ error: null });
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      setItem: (key: string, value: string) => store.set(key, value),
      getItem: (key: string) => store.get(key) ?? null,
    });
    render(<UnconfirmedJoinEmail joinCode="AB12CD" />);
    fireEvent.click(screen.getByTestId('join-unconfirmed-open'));
    fireEvent.change(screen.getByLabelText('Email you signed up with'), { target: { value: 'a@student.mpac.nsw.edu.au' } });
    fireEvent.click(screen.getByTestId('join-unconfirmed-resend'));
    await waitFor(() => expect(resend).toHaveBeenCalledWith('a@student.mpac.nsw.edu.au'));
    expect(store.get('joinClassroomReturnCode')).toBe('AB12CD');
    expect(screen.getByRole('status')).toHaveTextContent('sent another link');
  });

  it('refuses a wholly different address before calling the server', async () => {
    render(<UnconfirmedJoinEmail joinCode="AB12CD" />);
    fireEvent.click(screen.getByTestId('join-unconfirmed-open'));
    fireEvent.change(screen.getByLabelText('Email you signed up with'), { target: { value: 'a@school.edu' } });
    fireEvent.change(screen.getByLabelText('Corrected email'), { target: { value: 'b@other-school.edu' } });
    fireEvent.click(screen.getByTestId('join-unconfirmed-correct'));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('more than a small typo');
  });

  it('opens already filled when the signed-in student is unconfirmed, and still lets them join', () => {
    render(<UnconfirmedJoinEmail joinCode="AB12CD" signedInEmail="a@school.edu" />);
    expect(screen.getByTestId('join-unconfirmed-panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Email you signed up with')).toHaveValue('a@school.edu');
    expect(screen.getByText(/You can still join/)).toBeInTheDocument();
  });
});
