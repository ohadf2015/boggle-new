import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NearpodSilverFreeTierHonestyStrip } from '../NearpodSilverFreeTierHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsNearpod.silverFree.eyebrow': 'Free-tier caps — honesty foil',
        'education.vsNearpod.silverFree.title':
          'Nearpod Silver: 40 joins/lesson + 300 MB. LexiClash: whole-class free (50) + miss→reteach Live.',
        'education.vsNearpod.silverFree.lede':
          'Nearpod pricing publishes Silver free caps of 40 joins per lesson and 300 MB storage (Gold 75 / Platinum 90 / School 250). LexiClash free covers up to 50 with miss→Live.',
        'education.vsNearpod.silverFree.nearpodTitle': 'Nearpod Silver (free) — published caps',
        'education.vsNearpod.silverFree.nearpodBody':
          'Silver $0: 40 joins per lesson + 300 MB storage. Gold 75 / Platinum 90 / School·District 250.',
        'education.vsNearpod.silverFree.lexiTitle': 'LexiClash — whole-class free + miss→Live',
        'education.vsNearpod.silverFree.lexiBody':
          'Free tier: up to 50 students per class plus miss-gap → reteach Live.',
        'education.vsNearpod.silverFree.citePrefix': 'Nearpod pricing:',
        'education.vsNearpod.silverFree.citePricingLabel': 'nearpod.com/pricing (Silver $0)',
        'education.vsNearpod.silverFree.citeSuffix':
          ' — Silver 40 joins + 300 MB; Gold 75; Platinum 90; School/District 250.',
        'education.vsNearpod.silverFree.cta':
          'Host whole-class free vocab with a clear 50-seat free limit',
      };
      return map[key] || key;
    },
  }),
}));

describe('NearpodSilverFreeTierHonestyStrip', () => {
  it('renders Silver free caps foil with LexiClash-only CTA', () => {
    const html = renderToStaticMarkup(<NearpodSilverFreeTierHonestyStrip locale="en" />);
    expect(html).toMatch(/nearpod-silver-free-tier-honesty-strip/);
    expect(html).toMatch(/40/);
    expect(html).toMatch(/300 MB/);
    expect(html).toMatch(/50-seat free limit/);
    expect(html).toMatch(/nearpod\.com\/pricing/);
    const cta = html.match(/data-testid="nearpod-silver-free-tier-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/50/);
    expect(cta?.[1]).not.toMatch(/40|300|75|90|250/);
  });
});
