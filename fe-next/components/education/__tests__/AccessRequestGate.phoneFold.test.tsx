import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/lib/supabase', () => ({ resendEmailVerification: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn(), trackSignupFunnel: vi.fn(), latchSignupSource: vi.fn() }));
vi.mock('../AccessRequestForm', () => ({ AccessRequestForm: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => null }));
vi.mock('../AccessRequestGoogleButton', () => ({ AccessRequestGoogleButton: () => <button type="button">google</button> }));

import { AccessRequestGate } from '../AccessRequestGate';

const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('<AccessRequestGate> signed-out card on a phone', () => {
  it('GIVEN a signed-out teacher THEN both sign-up buttons and the no-card line come before the sign-in link', () => {
    render(<AccessRequestGate />);
    const email = screen.getByRole('button', { name: /education\.access\.auth_required_cta/ });
    const micro = screen.getByText('education.access.cta_micro');
    const signin = screen.getByRole('button', { name: 'education.access.auth_signin_cta' });
    expect(before(screen.getByText('google'), email)).toBe(true);
    expect(before(email, micro)).toBe(true);
    expect(before(micro, signin)).toBe(true);
  });

  it('GIVEN a phone THEN the explanatory body leaves the fold and stays from tablet width up', () => {
    render(<AccessRequestGate />);
    expect(screen.getByText('education.access.auth_required_body').className).toMatch(/max-sm:hidden/);
  });
});
