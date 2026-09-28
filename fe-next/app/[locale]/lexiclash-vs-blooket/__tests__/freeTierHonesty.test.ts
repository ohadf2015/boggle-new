import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-blooket free-tier honesty wiring', () => {
  it('wires BlooketFreeTierHonestyStrip on the compare page', () => {
    const page = readFileSync(
      join(__dirname, '../page.tsx'),
      'utf8',
    );
    expect(page).toMatch(/BlooketFreeTierHonestyStrip/);
    expect(page).toMatch(/BlooketGapsSetHonestyStrip/); // #1125 kept
  });

  it('JA/ES CTA i18n has LexiClash 50 only — no competitor caps', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsBlooket"');
      const ft = src.indexOf('"freeTier"', vs);
      const cta = src.indexOf('"cta":', ft);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/50/);
      expect(line).not.toMatch(/60|14-?day|300|365/);
    }
  });
});
