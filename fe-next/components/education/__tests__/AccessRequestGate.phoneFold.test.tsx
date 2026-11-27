import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('GIVEN the page h1 already says it THEN the stack has no second heading, body or divider, just the two buttons', () => {
    render(<AccessRequestGate />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByText('education.access.auth_required_title')).toBeNull();
    expect(screen.queryByText('education.access.auth_required_body')).toBeNull();
    expect(screen.queryByText('auth.magicLink.divider')).toBeNull();
  });

  it('GIVEN the email button WHEN pressed THEN it sinks onto its chunky lip', () => {
    render(<AccessRequestGate />);
    const email = screen.getByRole('button', { name: /education\.access\.auth_required_cta/ });
    fireEvent.pointerDown(email, { button: 0 });
    expect(email.getAttribute('data-pressed')).toBe('true');
  });
});
