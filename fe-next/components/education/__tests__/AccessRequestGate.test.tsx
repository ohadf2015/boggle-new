import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockAuth: { user: any; profile?: any; loading: boolean } = { user: null, loading: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: any) => (p?.email ? `${k}:${p.email}` : k), language: 'en' }),
}));

const resendMock = vi.fn(async () => ({ data: {}, error: null }));
vi.mock('@/lib/supabase', () => ({ resendEmailVerification: (...a: any[]) => resendMock(...a) }));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

// Stub the heavy form + modal so the gate is tested in isolation.
vi.mock('../AccessRequestForm', () => ({
  AccessRequestForm: ({ knownName, knownEmail }: { knownName?: string; knownEmail?: string }) => (
    <div data-testid="access-form">form:{knownEmail}:{knownName}</div>
  ),
}));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => <div data-testid="auth-modal" /> }));

import { AccessRequestGate } from '../AccessRequestGate';

describe('<AccessRequestGate>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = { user: null, loading: false };
    mockTrackGrowthEvent.mockClear();
  });

  it('prompts unauthenticated visitors to sign up instead of showing the form', () => {
    render(<AccessRequestGate />);
    expect(screen.getByText('education.access.auth_required_title')).toBeInTheDocument();
    expect(screen.queryByTestId('access-form')).not.toBeInTheDocument();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_gate_viewed', { state: 'auth_required' });
  });

  it('opens the auth modal when the sign-up CTA is clicked', async () => {
    render(<AccessRequestGate />);
    await userEvent.click(screen.getByRole('button', { name: /auth_required_cta/i }));
    expect(await screen.findByTestId('auth-modal')).toBeInTheDocument();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_signup_tapped', { mode: 'signup' });
  });

  it('emits edu_access_signup_tapped with mode: signin on sign-in CTA click', async () => {
    render(<AccessRequestGate />);
    await userEvent.click(screen.getByRole('button', { name: 'education.access.auth_signin_cta' }));
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_signup_tapped', { mode: 'signin' });
  });

  it.each([
    ['an anonymous arcade guest', { is_anonymous: true, email: null, email_confirmed_at: null }],
    ['a session with no email address', { email: '', email_confirmed_at: null }],
  ])('treats %s as signed out, never "we sent a link to ."', (_label, user) => {
    mockAuth = { user, loading: false };
    render(<AccessRequestGate />);
    expect(screen.getByRole('button', { name: /auth_required_cta/i })).toBeInTheDocument();
    expect(screen.queryByText(/verify_email_body/)).toBeNull();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_gate_viewed', { state: 'auth_required' });
  });

  it('blocks signed-in but unverified users, tracks verify_email view and offers a resend', async () => {
    mockAuth = { user: { email: 'jane@school.edu', email_confirmed_at: null }, loading: false };
    render(<AccessRequestGate />);
    expect(screen.getByText('education.access.verify_email_title')).toBeInTheDocument();
    expect(screen.queryByTestId('access-form')).not.toBeInTheDocument();
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_gate_viewed', { state: 'verify_email' });

    await userEvent.click(screen.getByRole('button', { name: /verify_email_resend/i }));
    expect(resendMock).toHaveBeenCalledWith('jane@school.edu');
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_verify_resent', { ok: true });
  });

  it('tracks edu_access_verify_resent with ok: false when resend fails', async () => {
    resendMock.mockResolvedValueOnce({ data: null, error: new Error('resend failed') });
    mockAuth = { user: { email: 'jane@school.edu', email_confirmed_at: null }, loading: false };
    render(<AccessRequestGate />);

    await userEvent.click(screen.getByRole('button', { name: /verify_email_resend/i }));
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_verify_resent', { ok: false });
  });

  it('renders the form with known account details for verified users and tracks form view', () => {
    mockAuth = {
      user: { email: 'jane@school.edu', email_confirmed_at: '2026-01-01T00:00:00Z' },
      profile: { display_name: 'Jane', username: 'janed' },
      loading: false,
    };
    render(<AccessRequestGate />);
    expect(screen.getByTestId('access-form')).toHaveTextContent('form:jane@school.edu:Jane');
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_gate_viewed', { state: 'form' });
  });

  it('does not throw or break interactions if trackGrowthEvent throws', async () => {
    mockTrackGrowthEvent.mockImplementation(() => {
      throw new Error('Analytics down');
    });
    render(<AccessRequestGate />);
    // Click signup button — should not throw
    await userEvent.click(screen.getByRole('button', { name: /auth_required_cta/i }));
    expect(await screen.findByTestId('auth-modal')).toBeInTheDocument();
  });
});
