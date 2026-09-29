import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WooclapStarterHonestyStrip } from '../WooclapStarterHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsWooclap.starter5.eyebrow': 'Free-tier caps — honesty foil',
        'education.vsWooclap.starter5.title':
          'Wooclap Starter: 5 active questions / 30d. LexiClash: free classroom play without an active-question meter.',
        'education.vsWooclap.starter5.lede':
          'Wooclap Help (June 2, 2026): Starter free up to 5 active questions; >5 active in 30 days → upgrade. Active = 3+ responses from unique participants. Pricing page: 5 questions per month + Unlimited participants. Up to 1000 participants all plans.',
        'education.vsWooclap.starter5.wooTitle': 'Wooclap Starter — published caps',
        'education.vsWooclap.starter5.wooBody':
          'Help: up to 5 active questions; >5 active in 30 days prompts upgrade. Active = 3+ unique-participant responses. Pricing: 5 questions per month; Unlimited participants; up to 1000 participants all plans.',
        'education.vsWooclap.starter5.lexiTitle': 'LexiClash — free classroom, no active-question meter',
        'education.vsWooclap.starter5.lexiBody':
          'Free classroom vocab play without a 5-active / 30-day question quota — question-quota honesty foil, not a participant-cap fight.',
        'education.vsWooclap.starter5.citePrefix': 'Wooclap:',
        'education.vsWooclap.starter5.citeHelpLabel': 'Help — pricing (5 active / 30d)',
        'education.vsWooclap.starter5.citePlansLabel': 'pricing-education (5 questions/month)',
        'education.vsWooclap.starter5.citeSuffix':
          ' — Starter: 5 active questions / 30 days; active = 3+ unique responses; up to 1000 participants.',
        'education.vsWooclap.starter5.cta':
          'Host free classroom vocab without an active-question meter',
      };
      return map[key] || key;
    },
  }),
}));

describe('WooclapStarterHonestyStrip', () => {
  it('renders Starter 5-active/30d foil with LexiClash-only CTA and locked URLs', () => {
    const html = renderToStaticMarkup(<WooclapStarterHonestyStrip locale="en" />);
    expect(html).toMatch(/wooclap-starter-honesty-strip/);
    expect(html).toMatch(/5 active questions/);
    expect(html).toMatch(/30 days|30d/);
    expect(html).toMatch(/3\+ responses from unique participants|3\+ unique/);
    expect(html).toMatch(/5 questions per month/);
    expect(html).toMatch(/Unlimited participants/);
    expect(html).toMatch(/1000 participants/);
    expect(html).toMatch(/docs\.wooclap\.com\/en\/articles\/14402104/);
    expect(html).toMatch(/wooclap\.com\/en\/pricing\/pricing-education/);
    expect(html).not.toMatch(/lexiclash\.com/);
    const cta = html.match(/data-testid="wooclap-starter-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/free classroom|without an active-question/i);
    expect(cta?.[1]).not.toMatch(/5 active|30 days|1000 participants|3\+/);
  });
});
