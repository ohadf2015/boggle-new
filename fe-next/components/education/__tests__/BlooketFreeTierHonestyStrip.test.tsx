import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlooketFreeTierHonestyStrip } from '../BlooketFreeTierHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsBlooket.freeTier.eyebrow': 'Free-tier caps — honesty foil',
        'education.vsBlooket.freeTier.title':
          'Blooket Starter: ≤60 live players + homework 14-day deadline. LexiClash: whole-class free (50) + miss→reteach Live.',
        'education.vsBlooket.freeTier.lede':
          'Blooket Starter free caps of up to 60 live players and homework deadlines up to 14 days (Plus 300 / 365). LexiClash free up to 50.',
        'education.vsBlooket.freeTier.blooketTitle': 'Blooket Starter (free) — published caps',
        'education.vsBlooket.freeTier.blooketBody':
          'Host a live game with up to 60 people on free; Plus raises to 300. Homework: 14 days Starter, 365 Plus.',
        'education.vsBlooket.freeTier.lexiTitle': 'LexiClash — whole-class free + miss→Live',
        'education.vsBlooket.freeTier.lexiBody':
          'Free tier: up to 50 students per class plus miss-gap → reteach Live.',
        'education.vsBlooket.freeTier.citePrefix': 'Blooket help / upgrade:',
        'education.vsBlooket.freeTier.citeIsFreeLabel': 'Is Blooket Free? (≤60 on free)',
        'education.vsBlooket.freeTier.citePlusLabel': 'Blooket Plus Features (300 / 365d)',
        'education.vsBlooket.freeTier.citeUpgradeLabel': 'Upgrade (Starter vs Plus table)',
        'education.vsBlooket.freeTier.citeSuffix':
          ' — Starter ≤60 live + homework ≤14d; Plus ≤300 live + homework ≤365d.',
        'education.vsBlooket.freeTier.cta':
          'Host whole-class free vocab with a clear 50-seat free limit',
      };
      return map[key] || key;
    },
  }),
}));

describe('BlooketFreeTierHonestyStrip', () => {
  it('renders free-tier caps foil with LexiClash-only CTA', () => {
    const html = renderToStaticMarkup(<BlooketFreeTierHonestyStrip locale="en" />);
    expect(html).toMatch(/blooket-free-tier-honesty-strip/);
    expect(html).toMatch(/60/);
    expect(html).toMatch(/14/);
    expect(html).toMatch(/50-seat free limit/);
    expect(html).toMatch(/help\.blooket\.com/);
    // CTA must not embed competitor caps as the CTA promise
    const cta = html.match(/data-testid="blooket-free-tier-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/50/);
    expect(cta?.[1]).not.toMatch(/60|14|300|365/);
  });
});
