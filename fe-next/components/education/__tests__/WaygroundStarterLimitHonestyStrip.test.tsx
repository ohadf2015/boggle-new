/**
 * Marketing honesty foil: Wayground Starter 20-activity library limit vs LexiClash reteach Live.
 * Distinct from Kahoot Go #1132 and Blooket Gaps #1125.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  WaygroundStarterLimitHonestyStrip,
  WAYGROUND_STARTER_LIMIT_EVIDENCE_URL,
} from '../WaygroundStarterLimitHonestyStrip';

const translations: Record<string, string> = {
  'education.vsWayground.starterLimit.eyebrow': 'Free-tier library — honesty foil',
  'education.vsWayground.starterLimit.title':
    'Wayground Starter: 20 activity library limit. LexiClash: reteach Live, no 20-resource ceiling.',
  'education.vsWayground.starterLimit.lede':
    'Wayground (Quizizz) Starter help — Updated 12 May 2026 — lists “20 activity limit: Store up to 20 resources.” LexiClash classroom reteach / Live deep-links miss gaps without a 20-resource library cap.',
  'education.vsWayground.starterLimit.waygroundTitle': 'Wayground Starter — 20 activity limit',
  'education.vsWayground.starterLimit.waygroundBody':
    'Starter (Basic) plan: Store up to 20 resources on your account. Hit 20 and you archive or upgrade before creating more — even when the class still needs reteach sets.',
  'education.vsWayground.starterLimit.lexiTitle': 'LexiClash — classroom reteach / Live',
  'education.vsWayground.starterLimit.lexiBody':
    'Miss gaps become a reteach Live deep-link — no 20-activity library ceiling on the free classroom loop.',
  'education.vsWayground.starterLimit.citePrefix': 'Wayground Starter plan:',
  'education.vsWayground.starterLimit.citeLabel': 'help.wayground.com Starter (Updated 12 May 2026)',
  'education.vsWayground.starterLimit.citeSuffix':
    ' — “20 activity limit: Store up to 20 resources”.',
  'education.vsWayground.starterLimit.cta': 'Launch classroom reteach Live without a 20-resource cap',
};

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => translations[key] ?? key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('WaygroundStarterLimitHonestyStrip', () => {
  it('foils Wayground Starter 20-activity limit against LexiClash reteach Live', () => {
    render(<WaygroundStarterLimitHonestyStrip locale="en" />);

    const strip = screen.getByTestId('wayground-starter-limit-honesty-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toMatch(/20/);
    expect(strip.textContent).toMatch(/activity|resources/i);
    expect(strip.textContent).toMatch(/Wayground|Quizizz/i);
    expect(strip.textContent).toMatch(/reteach|Live/i);

    expect(screen.getByTestId('wayground-starter-limit-card').textContent).toMatch(/20/);
    expect(screen.getByTestId('lexiclash-reteach-live-card').textContent).toMatch(/Live|reteach/i);
  });

  it('cites the Wayground Starter plan evidence URL', () => {
    render(<WaygroundStarterLimitHonestyStrip locale="en" />);
    const link = screen.getByTestId('wayground-starter-limit-evidence-link');
    expect(link).toHaveAttribute('href', WAYGROUND_STARTER_LIMIT_EVIDENCE_URL);
    expect(WAYGROUND_STARTER_LIMIT_EVIDENCE_URL).toContain('help.wayground.com');
    expect(WAYGROUND_STARTER_LIMIT_EVIDENCE_URL).toContain('158000404038');
  });

  it('CTAs into classroom-game for the locale', () => {
    render(<WaygroundStarterLimitHonestyStrip locale="he" />);
    expect(screen.getByTestId('wayground-starter-limit-cta')).toHaveAttribute(
      'href',
      '/he/education/classroom-game',
    );
  });
});
