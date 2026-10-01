import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/lib/supabase', () => ({ resendEmailVerification: vi.fn() }));
vi.mock('../AccessRequestForm', () => ({ AccessRequestForm: () => <div data-testid="access-form" /> }));
vi.mock('@/components/auth/AuthModal', () => ({
  default: ({ initialMode, audience }: { initialMode?: string; audience?: string }) => (
    <div data-testid="auth-modal" data-mode={initialMode} data-audience={audience} />
  ),
}));

import { AccessRequestGate } from '../AccessRequestGate';

describe('<AccessRequestGate> — a returning teacher signs in in one tap', () => {
  it('Given a signed-out visitor, When "Already have an account? Sign in" is tapped, Then the teacher modal opens on sign-in', async () => {
    render(<AccessRequestGate />);
    await userEvent.click(screen.getByRole('button', { name: 'education.access.auth_signin_cta' }));
    const modal = await screen.findByTestId('auth-modal');
    expect(modal).toHaveAttribute('data-mode', 'signin');
    expect(modal).toHaveAttribute('data-audience', 'teacher');
  });

  it('Given the sign-up CTA, Then the modal is the teacher variant too', async () => {
    render(<AccessRequestGate />);
    await userEvent.click(screen.getByRole('button', { name: /auth_required_cta/i }));
    const modal = await screen.findByTestId('auth-modal');
    expect(modal).toHaveAttribute('data-mode', 'signup');
    expect(modal).toHaveAttribute('data-audience', 'teacher');
  });
});
