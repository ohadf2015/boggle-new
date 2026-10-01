import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

const { path } = vi.hoisted(() => ({ path: { value: '/en/join/ABC123' as string | null } }));
vi.mock('next/navigation', () => ({ usePathname: () => path.value }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/utils/cookieConsent', () => ({
  hasConsentDecision: () => false,
  getConsentState: () => ({ analytics: false, advertising: false, timestamp: 0 }),
  acceptAll: vi.fn(),
  declineAll: vi.fn(),
  setConsentState: vi.fn(),
  resetConsent: vi.fn(),
  onConsentChange: () => () => {},
}));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.stubGlobal('requestIdleCallback', (cb: () => void) => { cb(); return 1; });
vi.stubGlobal('cancelIdleCallback', () => {});

import CookieConsent from '../CookieConsent';

describe('CookieConsent on student pages', () => {
  it.each(['/en/join/ABC123', '/he/student', '/es/student/lessons/1'])('Given %s, Then the bar is the dense one-row variant', (p) => {
    path.value = p;
    render(<CookieConsent />);
    const bar = document.querySelector('[data-cookie-consent]') as HTMLElement;
    expect(bar).toHaveAttribute('data-density', 'dense');
    expect(screen.getByText(/eduStudent.cookie.message/)).toBeInTheDocument();
  });

  it('still offers accept, customize and decline at equal weight, and the policy link', () => {
    path.value = '/en/join';
    render(<CookieConsent />);
    const names = ['cookieConsent.accept', 'cookieConsent.customize', 'cookieConsent.decline'];
    for (const name of names) {
      const btn = screen.getByRole('button', { name });
      expect(btn).toHaveClass('border-3');
      expect(btn).toHaveClass('text-sm');
      expect(btn).toHaveClass('min-w-0');
    }
    expect(screen.getByRole('link', { name: 'cookieConsent.learnMore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cookieConsent.accept' }).parentElement).toHaveClass('grid-cols-3');
  });

  it('keeps the regular bar everywhere else', () => {
    path.value = '/en/multiplayer';
    render(<CookieConsent />);
    expect(document.querySelector('[data-cookie-consent]')).toHaveAttribute('data-density', 'regular');
    expect(screen.getByText(/cookieConsent.message/)).toBeInTheDocument();
  });
});
