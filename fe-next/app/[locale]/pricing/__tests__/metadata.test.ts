import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

describe('/pricing metadata', () => {
  it('uses its own seo key, not the /teacher/upgrade one', () => {
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).toContain("seoKey: 'teacherPricing'");
  });

  it.each(LOCALES)('%s title and description differ from /teacher/upgrade', async (locale) => {
    const pricing = await generatePageMetadata({ seoKey: 'teacherPricing', path: '/pricing', locale });
    const upgrade = await generatePageMetadata({ seoKey: 'teacherUpgrade', path: '/teacher/upgrade', locale });
    expect(pricing.title).toBeTruthy();
    expect(pricing.title).not.toEqual(upgrade.title);
    expect(pricing.description).not.toEqual(upgrade.description);
    expect(String(pricing.description).length).toBeLessThanOrEqual(160);
  });
});
