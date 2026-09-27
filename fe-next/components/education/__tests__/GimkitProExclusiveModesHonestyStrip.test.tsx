/**
 * Marketing honesty foil: Gimkit Basic Pro-Exclusive modes 5-player limit
 * vs LexiClash whole-class free vocab.
 * Distinct from Wayground #1136, Kahoot Go #1132, Blooket Gaps #1125.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  GimkitProExclusiveModesHonestyStrip,
  GIMKIT_PLAYER_MAXIMUMS_EVIDENCE_URL,
  GIMKIT_PRO_FAQ_EVIDENCE_URL,
} from '../GimkitProExclusiveModesHonestyStrip';

const translations: Record<string, string> = {
  'education.vsGimkit.proExclusiveModes.eyebrow': 'Free-tier Pro Exclusive — honesty foil',
  'education.vsGimkit.proExclusiveModes.title':
    'Gimkit Basic: Pro-Exclusive modes limited to 5 players. LexiClash: whole-class free vocab.',
  'education.vsGimkit.proExclusiveModes.lede':
    'Gimkit help “Player maximums” states Pro Exclusive modes are limited to 5 players for Gimkit Basic members. LexiClash free classroom vocab covers a whole class (up to 50) without a 5-seat Pro-Exclusive mode.',
  'education.vsGimkit.proExclusiveModes.gimkitTitle':
    'Gimkit Basic — Pro Exclusive modes → 5 players',
  'education.vsGimkit.proExclusiveModes.gimkitBody':
    'Featured modes: unlimited on Basic. Pro Exclusive modes: limited to 5 players until you upgrade — even when the whole class needs that mode.',
  'education.vsGimkit.proExclusiveModes.lexiTitle': 'LexiClash — whole-class free vocab',
  'education.vsGimkit.proExclusiveModes.lexiBody':
    'Free tier: up to 50 students per class for word-formation vocab games. One published classroom cap — no Pro-Exclusive mode that shrinks to five seats.',
  'education.vsGimkit.proExclusiveModes.citePrefix': 'Gimkit help:',
  'education.vsGimkit.proExclusiveModes.citePlayerMaximumsLabel':
    'Player maximums (Pro Exclusive → 5 on Basic)',
  'education.vsGimkit.proExclusiveModes.citeProFaqLabel': 'Gimkit Pro FAQ',
  'education.vsGimkit.proExclusiveModes.citeSuffix':
    ' — Pro Exclusive modes limited to 5 players for Gimkit Basic members.',
  'education.vsGimkit.proExclusiveModes.cta':
    'Host whole-class free vocab without a 5-player Pro Exclusive cap',
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

describe('GimkitProExclusiveModesHonestyStrip', () => {
  it('foils Gimkit Basic Pro-Exclusive 5-player limit against LexiClash whole-class vocab', () => {
    render(<GimkitProExclusiveModesHonestyStrip locale="en" />);

    const strip = screen.getByTestId('gimkit-pro-exclusive-modes-honesty-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toMatch(/\b5\b/);
    expect(strip.textContent).toMatch(/Pro Exclusive|Pro-Exclusive/i);
    expect(strip.textContent).toMatch(/Gimkit/i);
    expect(strip.textContent).toMatch(/whole-class|vocab|50/i);

    expect(screen.getByTestId('gimkit-pro-exclusive-modes-card').textContent).toMatch(/\b5\b/);
    expect(screen.getByTestId('lexiclash-whole-class-vocab-card').textContent).toMatch(
      /whole-class|50|vocab/i,
    );
  });

  it('cites Gimkit player maximums and Pro FAQ evidence URLs', () => {
    render(<GimkitProExclusiveModesHonestyStrip locale="en" />);
    const playerMax = screen.getByTestId('gimkit-player-maximums-evidence-link');
    const proFaq = screen.getByTestId('gimkit-pro-faq-evidence-link');
    expect(playerMax).toHaveAttribute('href', GIMKIT_PLAYER_MAXIMUMS_EVIDENCE_URL);
    expect(proFaq).toHaveAttribute('href', GIMKIT_PRO_FAQ_EVIDENCE_URL);
    expect(GIMKIT_PLAYER_MAXIMUMS_EVIDENCE_URL).toContain('help.gimkit.com');
    expect(GIMKIT_PLAYER_MAXIMUMS_EVIDENCE_URL).toContain('player-maximums-18mbcz0');
    expect(GIMKIT_PRO_FAQ_EVIDENCE_URL).toContain('gimkit-pro-faq-14h6d62');
  });

  it('CTAs into classroom-game for the locale', () => {
    render(<GimkitProExclusiveModesHonestyStrip locale="he" />);
    expect(screen.getByTestId('gimkit-pro-exclusive-modes-cta')).toHaveAttribute(
      'href',
      '/he/education/classroom-game',
    );
  });
});
