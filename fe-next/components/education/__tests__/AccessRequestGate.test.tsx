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
  });

  it('prompts unauthenticated visitors to sign up instead of showing the form', () => {
    render(<AccessRequestGate />);
    expect(screen.getByText('education.access.auth_required_title')).toBeInTheDocument();
    expect(screen.queryByTestId('access-form')).not.toBeInTheDocument();
  });

  it('opens the auth modal when the sign-up CTA is clicked', async () => {
    render(<AccessRequestGate />);
    await userEvent.click(screen.getByRole('button', { name: /auth_required_cta/i }));
    expect(await screen.findByTestId('auth-modal')).toBeInTheDocument();
  });

  it('blocks signed-in but unverified users and offers a resend', async () => {
    mockAuth = { user: { email: 'jane@school.edu', email_confirmed_at: null }, loading: false };
    render(<AccessRequestGate />);
    expect(screen.getByText('education.access.verify_email_title')).toBeInTheDocument();
    expect(screen.queryByTestId('access-form')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /verify_email_resend/i }));
    expect(resendMock).toHaveBeenCalledWith('jane@school.edu');
  });

  it('renders the form with known account details for verified users', () => {
    mockAuth = {
      user: { email: 'jane@school.edu', email_confirmed_at: '2026-01-01T00:00:00Z' },
      profile: { display_name: 'Jane', username: 'janed' },
      loading: false,
    };
    render(<AccessRequestGate />);
    expect(screen.getByTestId('access-form')).toHaveTextContent('form:jane@school.edu:Jane');
  });
});
