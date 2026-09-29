import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-mentimeter Free 50/month honesty wiring', () => {
  it('wires MentimeterFreeTierHonestyStrip and locks 50 + URLs', () => {
    const page = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
    expect(page).toMatch(/MentimeterFreeTierHonestyStrip/);
    expect(page).toMatch(/50 participants per month/);
    expect(page).toMatch(/Participants per month: 50/);
    expect(page).toMatch(/help\.mentimeter\.com\/en\/articles\/1258367/);
    expect(page).toMatch(/mentimeter\.com\/plans\?view=standard/);
    expect(page).toMatch(/https:\/\/www\.lexiclash\.live/);
    expect(page).not.toMatch(/https:\/\/([a-z.]*\.)?lexiclash\.com/);
    expect(page).toMatch(/Unlimited participants once per month/);
    expect(page).toMatch(/account-creation date|8-hour grace/);
  });

  it('JA/ES CTA i18n has LexiClash 50 only — no Mentimeter counter copy', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsMentimeter"');
      expect(vs).toBeGreaterThan(-1);
      const ft = src.indexOf('"free50"', vs);
      const cta = src.indexOf('"cta":', ft);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/50/);
      expect(line).not.toMatch(/8-hour|Unlimited participants once|account-creation|1258367/);
    }
  });
});
