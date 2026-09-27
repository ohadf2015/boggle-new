// Regression guard for settings-row-control-clipping: the content wrapper is a
// flex item of the flex-col page root, so without `min-w-0` (+ an explicit
// width to beat its `mx-auto`) it keeps min-width:auto and inflates to its
// content's min-content (~486px). On a phone that overflows; in RTL the
// overflow spills left and shoves every row's toggle/slider off-screen — the
// "controls clipped / not controllable" bug. These classes must not regress.
//
// jsdom has no layout engine, so the live geometry was verified in a real
// browser (360px + 390px, RTL). This test only locks the class contract.

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SettingsPageClient from '../PageClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as Record<string, never>)} />;
  },
}));
vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
}));
vi.mock('framer-motion', () => ({
  // Map m.div / m.section / … to the plain host element so the tree renders.
  m: new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        ({ children, ...rest }: { children?: React.ReactNode }) =>
          // strip framer-only props that React would warn about
          React.createElement(tag, sanitize(rest), children),
    },
  ),
}));

import React from 'react';

function sanitize(props: Record<string, unknown>) {
  const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
  void initial; void animate; void exit; void transition; void whileHover; void whileTap; void variants;
  return rest;
}

vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', setLanguage: vi.fn() }),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ volume: 0.5, setVolume: vi.fn(), isMuted: false, toggleMute: vi.fn() }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ sfxVolume: 0.5, setSfxVolume: vi.fn(), sfxMuted: false, toggleSfxMute: vi.fn() }),
}));
vi.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    settings: {
      reduceMotion: 'system',
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      cosyMode: false,
    },
    toggleFireRoundLights: vi.fn(),
    toggleEarthquakeEffects: vi.fn(),
    cycleReduceMotion: vi.fn(),
    toggleCosyMode: vi.fn(),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('@/components/AutoHideHeader', () => ({ default: () => <header /> }));
vi.mock('@/components/settings/DeleteAccountSection', () => ({ default: () => <section /> }));
vi.mock('@/components/notifications/NotificationCategoryPreferences', () => ({
  NotificationCategoryPreferences: () => <section />,
}));

describe('SettingsPageClient layout', () => {
  it('gives the content wrapper shrink classes so controls never clip in RTL', () => {
    const { container } = render(<SettingsPageClient />);
    const wrapper = container.querySelector('.page-content-safe');
    expect(wrapper).not.toBeNull();
    const cls = wrapper!.className;
    expect(cls).toContain('min-w-0');
    expect(cls).toContain('w-full');
  });
});
