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

describe('CookieConsent copy on ad-free surfaces', () => {
  it.each(['/en/teacher', '/en/education', '/es/education/access', '/he/teacher/classroom/abc'])(
    'Given the ad-free teacher surface %s, Then the bar does not promise ads',
    (p) => {
      path.value = p;
      render(<CookieConsent />);
      expect(screen.queryByText(/cookieConsent.message/)).toBeNull();
      expect(screen.getByText(/eg2Fix.cookie.adFreeMessage/)).toBeInTheDocument();
    },
  );

  it('Given an arcade page, Then the bar keeps the regular ads copy', () => {
    path.value = '/en/multiplayer';
    window.history.replaceState(null, '', '/en/multiplayer');
    render(<CookieConsent />);
    expect(screen.getByText(/cookieConsent.message/)).toBeInTheDocument();
  });

  it.each(['?room=ESH9HQ&classroom=true', '?academy=1'])(
    'Given the classroom/academy multiplayer surface %s, Then the bar does not promise ads',
    (search) => {
      path.value = '/en/multiplayer';
      window.history.replaceState(null, '', `/en/multiplayer${search}`);
      render(<CookieConsent />);
      expect(screen.queryByText(/cookieConsent.message/)).toBeNull();
      expect(screen.getByText(/eg2Fix.cookie.adFreeMessage/)).toBeInTheDocument();
      window.history.replaceState(null, '', '/');
    },
  );
});

describe('student cookie line never mentions ads, in any locale', () => {
  it.each(['en', 'he', 'sv', 'ja', 'es'])('%s eduStudent.cookie.message has no ad wording', async (lang) => {
    const mod = await import(`../../translations/${lang}.js`);
    const bundle = (mod[lang] ?? mod.default) as Record<string, any>;
    const line: string = bundle.eduStudent.cookie.message;
    expect(line).toBeTruthy();
    expect(line).not.toMatch(/\bads?\b|annons|広告|anuncio|publicidad|פרסומ/i);
  });

  it.each(['en', 'he', 'sv', 'ja', 'es'])('%s has eg2Fix.cookie.adFreeMessage without ad promises', async (lang) => {
    const mod = await import(`../../translations/${lang}.js`);
    const bundle = (mod[lang] ?? mod.default) as Record<string, any>;
    const line: string = bundle.eg2Fix?.cookie?.adFreeMessage;
    expect(line).toBeTruthy();
    expect(line).not.toMatch(/show ads|visa annonser|広告を表示|mostrar anuncios|להציג פרסומות/i);
  });
});
