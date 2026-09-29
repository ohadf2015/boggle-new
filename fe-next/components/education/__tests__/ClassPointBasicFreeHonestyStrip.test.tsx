import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassPointBasicFreeHonestyStrip } from '../ClassPointBasicFreeHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsClassPoint.basicFree.eyebrow': 'Free-tier caps — honesty foil',
        'education.vsClassPoint.basicFree.title':
          'ClassPoint Basic Free: Max 25 class size / 5 Questions per PPT. LexiClash: whole-class free (50) + miss→reteach Live.',
        'education.vsClassPoint.basicFree.lede':
          'ClassPoint pricing publishes Basic Free: Max 25 class size, 5 Questions per PPT, 5 Question types, 3 Draggable objects, 3 saved classes. Distinct from Socrative Free 5 Quizzes / 1 Room / 50. LexiClash free covers up to 50 students per class with miss-gap → reteach Live — no 25-seat / 5-question PowerPoint ceiling.',
        'education.vsClassPoint.basicFree.cpTitle': 'ClassPoint Basic Free — published caps',
        'education.vsClassPoint.basicFree.cpBody':
          'Pricing Basic Free: Max 25 class size · 5 Questions per PPT · 5 Question types · 3 Draggable objects · 3 saved classes (plus 20 free AI quiz credits).',
        'education.vsClassPoint.basicFree.lexiTitle': 'LexiClash — whole-class free + miss→Live',
        'education.vsClassPoint.basicFree.lexiBody':
          'Free tier: up to 50 students per class for word-formation vocab games, plus miss-gap → reteach Live. No Max-25 / 5-Questions-per-PPT Free ceiling.',
        'education.vsClassPoint.basicFree.citePrefix': 'ClassPoint:',
        'education.vsClassPoint.basicFree.citePlansLabel':
          'classpoint.io/pricing (Basic Free: 25 / 5 Q)',
        'education.vsClassPoint.basicFree.citeSchoolsLabel': 'Schools & districts (Premium contrast)',
        'education.vsClassPoint.basicFree.citeSuffix':
          ' — Basic Free: Max 25 class size · 5 Questions per PPT.',
        'education.vsClassPoint.basicFree.cta':
          'Host whole-class free vocab with a clear 50-seat free limit',
      };
      return map[key] || key;
    },
  }),
}));

describe('ClassPointBasicFreeHonestyStrip', () => {
  it('renders Basic Free 25/5Q foil with LexiClash-only CTA and locked URLs', () => {
    const html = renderToStaticMarkup(<ClassPointBasicFreeHonestyStrip locale="en" />);
    expect(html).toMatch(/classpoint-basic-free-honesty-strip/);
    expect(html).toMatch(/Max 25 class size/);
    expect(html).toMatch(/5 Questions per PPT/);
    expect(html).toMatch(/Socrative Free 5 Quizzes/);
    expect(html).toMatch(/classpoint\.io\/pricing/);
    expect(html).toMatch(/classpoint\.io\/schools-districts/);
    expect(html).not.toMatch(/lexiclash\.com/);
    const cta = html.match(/data-testid="classpoint-basic-free-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/50/);
    expect(cta?.[1]).not.toMatch(/Max 25|5 Questions|Draggable/);
  });
});
