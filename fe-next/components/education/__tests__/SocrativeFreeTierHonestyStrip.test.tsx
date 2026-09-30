import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SocrativeFreeTierHonestyStrip } from '../SocrativeFreeTierHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsSocrative.freeTier.eyebrow': 'Free-tier caps — honesty foil',
        'education.vsSocrative.freeTier.title':
          'Socrative Free: 5 Quizzes / 1 Room / 50 students. LexiClash: whole-class free (50) + miss→reteach Live.',
        'education.vsSocrative.freeTier.lede':
          'Socrative pricing publishes Free: 5 Quizzes, 1 Room, 50 student per activity (plus 30-day report history). Distinct from Wayground Basic 20 max activity storage. LexiClash free covers up to 50 students per class with miss-gap → reteach Live — no 5-quiz / 1-room Free library ceiling.',
        'education.vsSocrative.freeTier.socTitle': 'Socrative Free — published caps',
        'education.vsSocrative.freeTier.socBody':
          'Pricing Free: 5 Quizzes · 1 Room · 50 student per activity · 30-day report history. Help: Free keeps the last 5 modified quizzes and one room on downgrade.',
        'education.vsSocrative.freeTier.lexiTitle': 'LexiClash — whole-class free + miss→Live',
        'education.vsSocrative.freeTier.lexiBody':
          'Free tier: up to 50 students per class for word-formation vocab games, plus miss-gap → reteach Live. No 5-quiz / 1-room Free library ceiling.',
        'education.vsSocrative.freeTier.citePrefix': 'Socrative:',
        'education.vsSocrative.freeTier.citePlansLabel': 'socrative.com/pricing (Free: 5 / 1 / 50)',
        'education.vsSocrative.freeTier.citeHelpLabel': 'Help — choosing the right plan',
        'education.vsSocrative.freeTier.citeSuffix':
          ' — Free: 5 Quizzes · 1 Room · 50 students per activity.',
        'education.vsSocrative.freeTier.cta':
          'Host whole-class free vocab with a clear 50-seat free limit',
      };
      return map[key] || key;
    },
  }),
}));

describe('SocrativeFreeTierHonestyStrip', () => {
  it('renders Free 5/1/50 foil with LexiClash-only CTA and locked URLs', () => {
    const html = renderToStaticMarkup(<SocrativeFreeTierHonestyStrip locale="en" />);
    expect(html).toMatch(/socrative-free-tier-honesty-strip/);
    expect(html).toMatch(/5 Quizzes/);
    expect(html).toMatch(/1 Room/);
    expect(html).toMatch(/50 student/);
    expect(html).toMatch(/Wayground Basic 20 max/);
    expect(html).toMatch(/socrative\.com\/pricing/);
    expect(html).toMatch(/help\.socrative\.com/);
    expect(html).not.toMatch(/lexiclash\.com/);
    const cta = html.match(/data-testid="socrative-free-tier-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/50/);
    expect(cta?.[1]).not.toMatch(/5 Quizzes|1 Room|30-day/);
  });
});
