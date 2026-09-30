import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PadletNeonFreeHonestyStrip } from '../PadletNeonFreeHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsPadlet.neonFree.eyebrow': 'Neon Free honesty — 3 padlets + 20MB',
        'education.vsPadlet.neonFree.title':
          'Padlet Neon Free: 3 active padlets + 20MB upload/file. LexiClash: whole-class free vocab (50) — no 3-board gate.',
        'education.vsPadlet.neonFree.lede':
          'Padlet Neon Free publishes 3 fully customizable / active padlets and a 20MB upload limit per file (plus 1 user, 2-minute video / 5-minute audio recordings). Platinum unlocks unlimited padlets + 500MB uploads. LexiClash free covers up to 50 for word-formation vocab games with miss-gap → reteach Live — no 3-active-board Neon Free gate.',
        'education.vsPadlet.neonFree.padletTitle': 'Padlet Neon Free — active-board + upload caps',
        'education.vsPadlet.neonFree.padletBody':
          '3 active padlets · 20MB upload/file · 1 user · 2-min video / 5-min audio recordings. Platinum: unlimited padlets + 500MB uploads.',
        'education.vsPadlet.neonFree.lexiTitle':
          'LexiClash — whole-class free vocab without a 3-board gate',
        'education.vsPadlet.neonFree.lexiBody':
          'Free tier: up to 50 students per class for word-formation vocab games, plus miss-gap → reteach Live. No Neon Free 3-active-padlet or 20MB board-upload gate for classroom play.',
        'education.vsPadlet.neonFree.citePrefix': 'Padlet:',
        'education.vsPadlet.neonFree.citeHelpLabel':
          'padlet.help …/is-it-free (Neon Free: 3 padlets + 20MB)',
        'education.vsPadlet.neonFree.citeSubsLabel':
          'padlet.com/site/subscriptions (Free vs Platinum)',
        'education.vsPadlet.neonFree.citeSuffix':
          ' — Neon Free: 3 active padlets + 20MB upload/file.',
        'education.vsPadlet.neonFree.cta':
          'Host whole-class free vocab without a 3-board gate (50-seat free limit)',
      };
      return map[key] || key;
    },
  }),
}));

describe('PadletNeonFreeHonestyStrip', () => {
  it('renders Neon Free 3-padlet / 20MB foil with LexiClash-only CTA and locked URLs', () => {
    const html = renderToStaticMarkup(<PadletNeonFreeHonestyStrip locale="en" />);
    expect(html).toMatch(/padlet-neon-free-honesty-strip/);
    expect(html).toMatch(/3 active padlets|3 padlets/);
    expect(html).toMatch(/20MB/);
    expect(html).toMatch(/Platinum/);
    expect(html).toMatch(/padlet\.help/);
    expect(html).toMatch(/padlet\.com\/site\/subscriptions/);
    expect(html).not.toMatch(/lexiclash\.com/);
    const cta = html.match(/data-testid="padlet-neon-free-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/50|whole-class|3-board/i);
    expect(cta?.[1]).not.toMatch(/20MB|Platinum|Neon Free 3/);
  });
});
