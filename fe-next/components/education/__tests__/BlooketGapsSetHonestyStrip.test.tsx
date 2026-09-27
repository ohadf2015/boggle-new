/**
 * Marketing honesty foil: Blooket manual 「Gaps Set」 vs LexiClash #1124 miss-gap deep-link.
 * Does not exercise Unplugged CTA product behavior (#1124 already shipped).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  BlooketGapsSetHonestyStrip,
  BLOOKET_GAPS_SET_EVIDENCE_URL,
} from '../BlooketGapsSetHonestyStrip';

const translations: Record<string, string> = {
  'education.vsBlooket.gapsSet.eyebrow': 'After the report — honesty foil',
  'education.vsBlooket.gapsSet.title':
    'Blooket: sort Incorrect%, rebuild a 「Gaps Set」. LexiClash: miss → Live deep-link.',
  'education.vsBlooket.gapsSet.lede':
    'Blooket’s Opportunities for Growth / Incorrect% workflow still ends in manual homework rebuild. LexiClash turns the same miss list into an auto reteach Live deep-link (#1124).',
  'education.vsBlooket.gapsSet.blooketTitle': 'Blooket — manual 「Gaps Set」',
  'education.vsBlooket.gapsSet.blooketBody':
    'Sort by Incorrect%, skim Opportunities for Growth, rebuild a 「Gaps Set」 for homework.',
  'education.vsBlooket.gapsSet.lexiTitle': 'LexiClash — auto miss-gap deep-link (#1124)',
  'education.vsBlooket.gapsSet.lexiBody':
    'Miss chips deep-link into Unplugged / 3-min reteach Live — no 「Gaps Set」 rebuild.',
  'education.vsBlooket.gapsSet.citePrefix': 'Blooket teacher guide:',
  'education.vsBlooket.gapsSet.citeLabel': 'Identify knowledge gaps in Blooket reports',
  'education.vsBlooket.gapsSet.citeSuffix':
    ' — Workflow 2: Build a Targeted Follow-Up Set (「Gaps Set」).',
  'education.vsBlooket.gapsSet.cta': 'Try miss-gap → Live without rebuilding a set',
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

describe('BlooketGapsSetHonestyStrip', () => {
  it('foils Blooket manual Gaps Set against LexiClash #1124 miss-gap deep-link', () => {
    render(<BlooketGapsSetHonestyStrip locale="en" />);

    const strip = screen.getByTestId('blooket-gaps-set-honesty-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toMatch(/Incorrect%/);
    expect(strip.textContent).toMatch(/Opportunities for Growth/);
    expect(strip.textContent).toMatch(/Gaps Set/);
    expect(strip.textContent).toMatch(/#1124/);
    expect(strip.textContent).toMatch(/deep-link/i);

    expect(screen.getByTestId('blooket-gaps-set-manual-card').textContent).toMatch(/Gaps Set/);
    expect(screen.getByTestId('lexiclash-miss-gap-deeplink-card').textContent).toMatch(/#1124/);
  });

  it('cites the Blooket knowledge-gaps evidence URL', () => {
    render(<BlooketGapsSetHonestyStrip locale="en" />);
    const link = screen.getByTestId('blooket-gaps-set-evidence-link');
    expect(link).toHaveAttribute('href', BLOOKET_GAPS_SET_EVIDENCE_URL);
    expect(BLOOKET_GAPS_SET_EVIDENCE_URL).toContain('identify-knowledge-gaps-in-blooket-reports');
  });

  it('CTAs into classroom-game for the locale', () => {
    render(<BlooketGapsSetHonestyStrip locale="he" />);
    expect(screen.getByTestId('blooket-gaps-set-cta')).toHaveAttribute(
      'href',
      '/he/education/classroom-game',
    );
  });
});
