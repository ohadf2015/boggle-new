import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * AI crawlers do not run JavaScript. The hub's speakable node was a
 * next/script strategy="afterInteractive", so it never appeared in the
 * first HTML. The cite-able answer also sat after the whole marketing
 * page, outside the first 30% of the document.
 */
const DIR = path.resolve(__dirname, '..');

describe('education hub GEO placement', () => {
  const page = fs.readFileSync(path.join(DIR, 'page.tsx'), 'utf8');
  const client = fs.readFileSync(path.join(DIR, 'PageClient.tsx'), 'utf8');

  it('emits speakable JSON-LD in the server HTML, not after hydration', () => {
    expect(page).toContain('buildEducationPageJsonLd');
    expect(page).toContain('application/ld+json');
    expect(client).not.toContain('afterInteractive');
    expect(client).not.toContain('education-speakable-ld');
  });

  it('places the cite-able answer directly under the hero', () => {
    const hero = client.indexOf('<EducationHero');
    const slot = client.indexOf('{answer}');
    const roles = client.indexOf('education.landing.teacher');
    expect(hero).toBeGreaterThan(-1);
    expect(slot).toBeGreaterThan(hero);
    expect(slot).toBeLessThan(roles);

    const open = page.indexOf('<EducationPageClient');
    const answer = page.indexOf('data-answer');
    const resources = page.indexOf('<EducationResourceLinks');
    expect(answer).toBeGreaterThan(open);
    expect(answer).toBeLessThan(resources);
  });

  it('ships duels and classroom HowTo schema in the first HTML', () => {
    for (const rel of ['duels/page.tsx', 'classroom-game/page.tsx']) {
      const src = fs.readFileSync(path.join(DIR, rel), 'utf8');
      expect(src, rel).not.toContain("from 'next/script'");
      expect(src, rel).toContain('type="application/ld+json"');
      expect(src, rel).toContain('dangerouslySetInnerHTML');
    }
  });
});
