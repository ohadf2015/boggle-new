import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/en/student' }));
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

// `edu-sky:` compiles to `html:has([data-edu-theme='sky']) &`, so these classes
// only apply on classroom sky pages; the navy defaults stay for everything else.
describe('CookieConsent on a classroom sky page', () => {
  it('turns the bar cream with a black outline and black ink, keeping navy as the default', () => {
    render(<CookieConsent />);
    const bar = document.querySelector('[data-cookie-consent]') as HTMLElement;
    expect(bar).toHaveClass('bg-neo-navy', 'edu-sky:bg-edu-surface', 'edu-sky:border-edu-line');
    expect(screen.getByText(/eduStudent.cookie.message/)).toHaveClass('edu-sky:text-edu-ink');
    expect(screen.getByRole('link', { name: 'cookieConsent.learnMore' })).toHaveClass('edu-sky:text-edu-cyan-ink');
  });

  it('gives the light-on-navy buttons black ink and outline on cream', () => {
    render(<CookieConsent />);
    for (const name of ['cookieConsent.customize', 'cookieConsent.decline']) {
      expect(screen.getByRole('button', { name })).toHaveClass('edu-sky:text-edu-ink', 'edu-sky:border-edu-line');
    }
  });

  it('keeps the preference toggles readable on cream', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole('button', { name: 'cookieConsent.customize' }));
    expect(screen.getByText('cookieConsent.categories.analyticsDesc')).toHaveClass('edu-sky:text-edu-ink');
  });
});
