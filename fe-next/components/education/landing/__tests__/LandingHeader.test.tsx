import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingHeader } from '../LandingHeader';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
const auth = { isAuthenticated: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({
  QuickLanguageSwitcher: () => <div data-testid="lang-switcher" />,
}));
vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: ({ initialMode, audience }: { initialMode: string; audience: string }) => (
    <div data-testid="auth-modal" data-mode={initialMode} data-audience={audience} />
  ),
}));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (props: { initialMode: string; audience: string }) => (
    <div data-testid="auth-modal" data-mode={props.initialMode} data-audience={props.audience} />
  ),
}));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

describe('LandingHeader', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    track.mockClear();
  });

  it('has a logo that goes to the education home, so no edu page leaks to the marketing home', () => {
    render(<LandingHeader />);
    expect(screen.getByTestId('landing-header-home')).toHaveAttribute('href', '/he/education');
  });

  it('puts the free start one tap away, straight to the access page', () => {
    render(<LandingHeader />);
    const start = screen.getByTestId('landing-header-start');
    expect(start).toHaveAttribute('href', '/he/education/access');
    expect(start.getAttribute('href')).not.toMatch(/from=/);
  });

  it('opens the teacher sign-in modal for a returning teacher', () => {
    render(<LandingHeader />);
    fireEvent.click(screen.getByTestId('education-sign-in'));
    const modal = screen.getByTestId('auth-modal');
    expect(modal).toHaveAttribute('data-mode', 'signin');
    expect(modal).toHaveAttribute('data-audience', 'teacher');
    expect(track).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'education_sign_in' });
  });

  it('drops sign-in once signed in', () => {
    auth.isAuthenticated = true;
    render(<LandingHeader />);
    expect(screen.queryByTestId('education-sign-in')).toBeNull();
  });

  it('can hide the start button on the page that is itself the start', () => {
    render(<LandingHeader showStart={false} />);
    expect(screen.queryByTestId('landing-header-start')).toBeNull();
  });

  it('carries the language switcher', () => {
    render(<LandingHeader />);
    expect(screen.getByTestId('lang-switcher')).toBeInTheDocument();
  });
});
