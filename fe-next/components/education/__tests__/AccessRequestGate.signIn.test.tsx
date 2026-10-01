import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/lib/supabase', () => ({ resendEmailVerification: vi.fn() }));
vi.mock('../AccessRequestForm', () => ({ AccessRequestForm: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({
  default: ({ initialMode }: { initialMode: string }) => <div data-testid="auth-modal">{initialMode}</div>,
}));

import { AccessRequestGate } from '../AccessRequestGate';

describe('<AccessRequestGate> signed-out teacher', () => {
  it('offers a sign-in path, not only sign-up, for a teacher who already has an account', async () => {
    render(<AccessRequestGate />);
    await userEvent.click(screen.getByRole('button', { name: 'education.access.auth_signin_cta' }));
    expect(await screen.findByTestId('auth-modal')).toHaveTextContent('signin');
  });

  it('keeps sign-up as the primary CTA', async () => {
    render(<AccessRequestGate />);
    await userEvent.click(screen.getByRole('button', { name: /auth_required_cta/ }));
    expect(await screen.findByTestId('auth-modal')).toHaveTextContent('signup');
  });
});
