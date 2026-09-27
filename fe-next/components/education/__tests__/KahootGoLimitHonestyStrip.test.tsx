/**
 * Marketing honesty foil: Kahoot! Go Free table 40 vs FAQ 10 vs LexiClash clear 50.
 * Does not exercise Unplugged CTA product behavior (#1124 already shipped).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  KahootGoLimitHonestyStrip,
  KAHOOT_GO_LIMIT_EVIDENCE_URL,
} from '../KahootGoLimitHonestyStrip';

const translations: Record<string, string> = {
  'education.vsKahoot.goLimit.eyebrow': 'Free-tier seats — honesty foil',
  'education.vsKahoot.goLimit.title':
    'Kahoot! Go Free: plans table says 40. Same-page FAQ says 10. LexiClash: clear 50.',
  'education.vsKahoot.goLimit.lede':
    'On kahoot.com/schools/plans the Go Free column lists Participant limit 40, while the FAQ “What are the participant limits per game?” answers Go up to 10. LexiClash publishes one free classroom cap — 50 students — so the join code matches the plan page.',
  'education.vsKahoot.goLimit.kahootTitle': 'Kahoot! Go Free — table 40 vs FAQ 10',
  'education.vsKahoot.goLimit.kahootBody':
    'Plans table: Participant limit 40. Same-page FAQ: Go up to 10 participants per game. Teachers cannot tell which free-tier ceiling applies before hosting.',
  'education.vsKahoot.goLimit.lexiTitle': 'LexiClash — clear free classroom limit',
  'education.vsKahoot.goLimit.lexiBody':
    'Free tier: up to 50 students per class (3 classes). One published number — no table/FAQ mismatch.',
  'education.vsKahoot.goLimit.citePrefix': 'Kahoot schools plans:',
  'education.vsKahoot.goLimit.citeLabel': 'kahoot.com/schools/plans',
  'education.vsKahoot.goLimit.citeSuffix':
    ' — table Participant limit 40; FAQ “What are the participant limits per game?” Go up to 10.',
  'education.vsKahoot.goLimit.cta': 'Host a whole class with a clear 50-seat free limit',
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

describe('KahootGoLimitHonestyStrip', () => {
  it('foils Kahoot Go Free table 40 vs FAQ 10 against LexiClash clear 50', () => {
    render(<KahootGoLimitHonestyStrip locale="en" />);

    const strip = screen.getByTestId('kahoot-go-limit-honesty-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toMatch(/40/);
    expect(strip.textContent).toMatch(/10/);
    expect(strip.textContent).toMatch(/Go Free|Go up to/i);
    expect(strip.textContent).toMatch(/50/);
    expect(strip.textContent).toMatch(/FAQ/);

    expect(screen.getByTestId('kahoot-go-limit-ambiguous-card').textContent).toMatch(/40/);
    expect(screen.getByTestId('kahoot-go-limit-ambiguous-card').textContent).toMatch(/10/);
    expect(screen.getByTestId('lexiclash-clear-limit-card').textContent).toMatch(/50/);
  });

  it('cites the Kahoot schools plans evidence URL', () => {
    render(<KahootGoLimitHonestyStrip locale="en" />);
    const link = screen.getByTestId('kahoot-go-limit-evidence-link');
    expect(link).toHaveAttribute('href', KAHOOT_GO_LIMIT_EVIDENCE_URL);
    expect(KAHOOT_GO_LIMIT_EVIDENCE_URL).toContain('kahoot.com/schools/plans');
  });

  it('CTAs into classroom-game for the locale', () => {
    render(<KahootGoLimitHonestyStrip locale="he" />);
    expect(screen.getByTestId('kahoot-go-limit-cta')).toHaveAttribute(
      'href',
      '/he/education/classroom-game',
    );
  });
});
