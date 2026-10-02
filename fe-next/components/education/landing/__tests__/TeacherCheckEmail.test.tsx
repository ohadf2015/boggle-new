import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeacherCheckEmail } from '../TeacherCheckEmail';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, _f?: unknown, vars?: Record<string, string>) => (vars?.email ? `${k}:${vars.email}` : k),
    language: 'en',
  }),
}));

const resend = vi.fn();
vi.mock('@/lib/supabase', () => ({
  resendEmailVerification: (...a: unknown[]) => resend(...a),
}));

describe('TeacherCheckEmail', () => {
  beforeEach(() => resend.mockReset());

  it('names the exact address the link went to', () => {
    render(<TeacherCheckEmail email="ms.k@school.org" onChangeEmail={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('ms.k@school.org');
  });

  it('says the link brings the teacher back to finish, so verification is not the end', () => {
    render(<TeacherCheckEmail email="a@b.co" onChangeEmail={() => {}} />);
    expect(screen.getByText('eg2Land.checkEmail.next')).toBeInTheDocument();
  });

  it('resends the confirmation and reports it was sent', async () => {
    resend.mockResolvedValue({ error: null });
    render(<TeacherCheckEmail email="a@b.co" onChangeEmail={() => {}} />);
    fireEvent.click(screen.getByTestId('teacher-check-email-resend'));
    expect(resend).toHaveBeenCalledWith('a@b.co');
    await waitFor(() => expect(screen.getByTestId('teacher-check-email-resend')).toHaveTextContent('eg2Land.checkEmail.resent'));
  });

  it('shows an error when the resend fails instead of pretending it worked', async () => {
    resend.mockResolvedValue({ error: { message: 'rate limit' } });
    render(<TeacherCheckEmail email="a@b.co" onChangeEmail={() => {}} />);
    fireEvent.click(screen.getByTestId('teacher-check-email-resend'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('eg2Land.checkEmail.resendError'));
  });

  it('opens the common webmail inboxes in a new tab', () => {
    render(<TeacherCheckEmail email="a@b.co" onChangeEmail={() => {}} />);
    const gmail = screen.getByTestId('teacher-check-email-gmail');
    expect(gmail.getAttribute('href')).toMatch(/^https:\/\/mail\.google\.com\//);
    expect(gmail).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('teacher-check-email-outlook').getAttribute('href')).toMatch(/^https:\/\/outlook\.live\.com\//);
  });

  it('lets a teacher who mistyped go back and use a different address', () => {
    const onChange = vi.fn();
    render(<TeacherCheckEmail email="typo@b.co" onChangeEmail={onChange} />);
    fireEvent.click(screen.getByTestId('teacher-check-email-change'));
    expect(onChange).toHaveBeenCalled();
  });
});
