import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { buildTeacherProProductJsonLd } from '@/lib/seo/teacherUpgradeJsonLd';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const LOCALES = { en, he, sv, ja, es, ru } as const;
type Locale = keyof typeof LOCALES;

/** Checkout-command framing the H1 gauntlet rejected. Must not lead the snippet or the card. */
const LOSING = /unlimited classrooms|Unlimited Classes|Upgrade to Teacher Pro|כיתות ללא הגבלה|שדרוג לפרו|clases ilimitadas|Mejora a Teacher Pro|無制限のクラス|アップグレードすると|obegränsat antal klasser|Uppgradera till Teacher Pro|неограниченное число классов|Перейдите на Teacher Pro/i;

function headline(locale: Locale): string {
  const title = LOCALES[locale].teacher?.subscription?.upgradePricingTitle;
  if (typeof title !== 'string' || title.length < 8) {
    throw new Error(`${locale} is missing teacher.subscription.upgradePricingTitle`);
  }
  return title;
}

describe('teacher upgrade metadata matches the winning H1', () => {
  it.each(Object.keys(LOCALES) as Locale[])(
    '%s SERP, Open Graph, Twitter and JSON-LD lead with the on-page H1',
    async (locale) => {
      const winning = headline(locale);
      const seo = LOCALES[locale].seo.teacherUpgrade;
      const meta = await generatePageMetadata({
        seoKey: 'teacherUpgrade',
        path: '/teacher/upgrade',
        locale,
      });
      const og = meta.openGraph as { title?: string; description?: string };
      const tw = meta.twitter as { title?: string; description?: string };

      expect(seo.ogTitle).toBe(winning);
      expect(seo.description.startsWith(winning)).toBe(true);
      expect(seo.description.length).toBeLessThanOrEqual(160);
      expect(seo.ogDescription.startsWith(winning)).toBe(true);
      expect(String(meta.title)).toContain(winning.replace(/[。.]$/, ''));
      expect(meta.description).toBe(seo.description);
      expect(og.title).toBe(winning);
      expect(og.description).toBe(seo.ogDescription);
      expect(tw?.title).toBe(og.title);
      expect(tw?.description).toBe(og.description);
      expect(`${seo.title} ${seo.description} ${seo.ogTitle} ${seo.ogDescription}`).not.toMatch(LOSING);

      const schema = buildTeacherProProductJsonLd(locale, {
        name: 'Teacher Pro',
        description: seo.description,
      });
      expect(schema.description).toBe(seo.description);
      expect(schema.description.startsWith(winning)).toBe(true);
    },
  );

  it('does not fall back to the checkout-command copy the gauntlet rejected', () => {
    const upgrade = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    const pricing = readFileSync(join(__dirname, '..', '..', '..', 'pricing', 'page.tsx'), 'utf8');
    for (const page of [upgrade, pricing]) {
      expect(page).not.toContain('unlimited classrooms');
      expect(page).toContain('See who got it before the bell');
    }
  });
});
