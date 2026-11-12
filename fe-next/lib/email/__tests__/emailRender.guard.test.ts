import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EmailSample } from '../samples/types';

const modules = import.meta.glob<{ samples: EmailSample[] }>('../samples/*.sample.ts', { eager: true });
const all = Object.values(modules).flatMap((m) => m.samples);
const PUBLIC = join(__dirname, '..', '..', '..', 'public');
const RTL = new Set(['he', 'ar']);

describe('every customer email renders on the neo layout', () => {
  it('has samples', () => expect(all.length).toBeGreaterThan(0));

  it.each(all.map((s) => [`${s.name} [${s.locale}]`, s] as const))('%s', async (_label, s) => {
    const { subject, html } = await s.render();
    expect(subject.trim().length).toBeGreaterThan(0);
    expect(html).not.toMatch(/undefined|\[object|NaN/);
    expect(html).toContain('/email/art/');
    expect(html).not.toContain('ohadf2015');
    expect(html.toLowerCase(), 'pure black inverts in Gmail Android dark mode').not.toMatch(/#000000\b|#000\b/);
    expect(Buffer.byteLength(html)).toBeLessThan(90_000);
    if (RTL.has(s.locale)) expect(html).toContain('dir="rtl"');
    if (s.needsUnsubscribe) expect(html).toMatch(/unsubscribe/i);
    for (const [, src] of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      expect(src).toMatch(/^https:\/\/www\.lexiclash\.live\//);
      const path = new URL(src).pathname;
      expect(existsSync(join(PUBLIC, decodeURIComponent(path))), `missing public${path}`).toBe(true);
    }
  });

  it.each(all.filter((s) => s.locale !== 'en').map((s) => [`${s.name} [${s.locale}]`, s] as const))(
    '%s is translated, not the English fallback',
    async (_label, s) => {
      const en = all.find((o) => o.name === s.name && o.locale === 'en');
      if (!en) return;
      const [mine, theirs] = await Promise.all([s.render(), en.render()]);
      expect(mine.subject).not.toBe(theirs.subject);
      expect(mine.html).toContain(`lang="${s.locale}"`);
    },
  );
});
