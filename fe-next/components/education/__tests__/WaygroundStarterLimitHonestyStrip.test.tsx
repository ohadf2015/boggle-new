/**
 * Marketing honesty foil: Wayground Basic 20 max activity storage vs LexiClash free classroom vocab.
 * Distinct from Mentimeter #1183, Wooclap #1186, Nearpod #1169, Blooket #1166, Gimkit #1137.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  WaygroundStarterLimitHonestyStrip,
  WAYGROUND_STARTER_LIMIT_EVIDENCE_URL,
  WAYGROUND_PLANS_URL,
} from '../WaygroundStarterLimitHonestyStrip';

const translations: Record<string, string> = {
  'education.vsWayground.starterLimit.eyebrow': 'Free-tier library — honesty foil',
  'education.vsWayground.starterLimit.title':
    'Wayground Basic: 20 max activity storage. LexiClash: free classroom vocab, no 20-resource ceiling.',
  'education.vsWayground.starterLimit.lede':
    'Wayground plans list “20 max” activity storage; Starter help (Updated 12 May 2026) says “Store up to 20 resources.” LexiClash free classroom vocab has no 20-resource library cap.',
  'education.vsWayground.starterLimit.waygroundTitle': 'Wayground Basic — 20 max',
  'education.vsWayground.starterLimit.waygroundBody':
    'Basic / Starter: Unlimited activity storage → 20 max. Hit 20 and you archive or upgrade before creating more — even when the class still needs reteach sets.',
  'education.vsWayground.starterLimit.lexiTitle': 'LexiClash — free classroom vocab',
  'education.vsWayground.starterLimit.lexiBody':
    'Miss gaps become a reteach Live deep-link — no 20-activity library ceiling on the free classroom loop.',
  'education.vsWayground.starterLimit.citePrefix': 'Evidence:',
  'education.vsWayground.starterLimit.citePlansLabel': 'wayground.com/home/plans (“20 max”)',
  'education.vsWayground.starterLimit.citeHelpLabel':
    'help.wayground.com Starter (Updated 12 May 2026)',
  'education.vsWayground.starterLimit.citeSuffix':
    ' — “20 activity limit: Store up to 20 resources”.',
  'education.vsWayground.starterLimit.cta':
    'Launch free classroom vocab without a 20-resource cap',
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
  it('foils Wayground Basic 20 max against LexiClash free classroom vocab', () => {
    render(<WaygroundStarterLimitHonestyStrip locale="en" />);

    const strip = screen.getByTestId('wayground-starter-limit-honesty-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toMatch(/20/);
    expect(strip.textContent).toMatch(/activity|resources|max/i);
    expect(strip.textContent).toMatch(/Wayground|Quizizz/i);
    expect(strip.textContent).toMatch(/classroom|reteach|Live|vocab/i);

    expect(screen.getByTestId('wayground-starter-limit-card').textContent).toMatch(/20/);
    expect(screen.getByTestId('lexiclash-reteach-live-card').textContent).toMatch(
      /Live|reteach|classroom|vocab/i,
    );
  });

  it('cites plans 20 max and Starter help evidence URLs', () => {
    render(<WaygroundStarterLimitHonestyStrip locale="en" />);
    const help = screen.getByTestId('wayground-starter-limit-evidence-link');
    expect(help).toHaveAttribute('href', WAYGROUND_STARTER_LIMIT_EVIDENCE_URL);
    expect(WAYGROUND_STARTER_LIMIT_EVIDENCE_URL).toContain('help.wayground.com');
    expect(WAYGROUND_STARTER_LIMIT_EVIDENCE_URL).toContain('158000404038');

    const plans = screen.getByTestId('wayground-starter-plans-link');
    expect(plans).toHaveAttribute('href', WAYGROUND_PLANS_URL);
    expect(WAYGROUND_PLANS_URL).toContain('wayground.com/home/plans');
  });

  it('CTAs into classroom-game for the locale', () => {
    render(<WaygroundStarterLimitHonestyStrip locale="he" />);
    expect(screen.getByTestId('wayground-starter-limit-cta')).toHaveAttribute(
      'href',
      '/he/education/classroom-game',
    );
  });
});
