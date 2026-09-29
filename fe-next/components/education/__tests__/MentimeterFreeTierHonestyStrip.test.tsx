import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MentimeterFreeTierHonestyStrip } from '../MentimeterFreeTierHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsMentimeter.free50.eyebrow': 'Free-tier caps — honesty foil',
        'education.vsMentimeter.free50.title':
          'Mentimeter Free: 50 participants/month. LexiClash: whole-class free (50) + miss→reteach Live.',
        'education.vsMentimeter.free50.lede':
          'Mentimeter Help publishes up to 50 participants per month; the pricing table lists Participants per month: 50. Counter resets on the account-creation date. Free marketing bullets say Unlimited participants once per month.',
        'education.vsMentimeter.free50.mentiTitle': 'Mentimeter Free — published caps',
        'education.vsMentimeter.free50.mentiBody':
          'Help: Up to 50 participants per month. Pricing table Free: Participants per month: 50. Reset on account-creation date; 8-hour grace for one over-50 presentation.',
        'education.vsMentimeter.free50.lexiTitle': 'LexiClash — whole-class free + miss→Live',
        'education.vsMentimeter.free50.lexiBody':
          'Free tier: up to 50 students per class plus miss-gap → reteach Live.',
        'education.vsMentimeter.free50.citePrefix': 'Mentimeter:',
        'education.vsMentimeter.free50.citeHelpLabel': 'Help — Free account (50/month)',
        'education.vsMentimeter.free50.citePlansLabel': 'plans?view=standard (table: 50)',
        'education.vsMentimeter.free50.citeSuffix':
          ' — 50 participants per month; reset on account-creation date; 8-hour grace.',
        'education.vsMentimeter.free50.cta':
          'Host whole-class free vocab with a clear 50-seat free limit',
      };
      return map[key] || key;
    },
  }),
}));

describe('MentimeterFreeTierHonestyStrip', () => {
  it('renders Free 50/month foil with LexiClash-only CTA and locked URLs', () => {
    const html = renderToStaticMarkup(<MentimeterFreeTierHonestyStrip locale="en" />);
    expect(html).toMatch(/mentimeter-free-tier-honesty-strip/);
    expect(html).toMatch(/50 participants per month/);
    expect(html).toMatch(/Participants per month: 50/);
    expect(html).toMatch(/account-creation date/);
    expect(html).toMatch(/8-hour grace/);
    expect(html).toMatch(/Unlimited participants once per month/);
    expect(html).toMatch(/help\.mentimeter\.com\/en\/articles\/1258367/);
    expect(html).toMatch(/mentimeter\.com\/plans\?view=standard/);
    expect(html).not.toMatch(/lexiclash\.com/);
    const cta = html.match(/data-testid="mentimeter-free-tier-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/50/);
    expect(cta?.[1]).not.toMatch(/8-hour|Unlimited participants once|account-creation/);
  });
});
