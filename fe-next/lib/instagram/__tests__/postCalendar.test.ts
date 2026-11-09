import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { EN_POSTS, HE_POSTS, RETIRED_CLAIM_IMAGES } from '../postCalendar';

const PROMO_DIR = join(process.cwd(), 'public/images/promo');
const all = [
  ...Object.entries(EN_POSTS).map(([d, p]) => ({ id: `en:${d}`, ...p })),
  ...Object.entries(HE_POSTS).map(([d, p]) => ({ id: `he:${d}`, ...p })),
];

// Numbers that look like stats: percentages, or any number of 4+ digits that is not a year.
const STAT = /\d+\s*%|%\s*\d+|\b\d{1,3}(?:,\d{3})+\b|\b(?!(?:19|20)\d{2}\b)\d{4,}\b/;
const STUDY = /\b(study|studies|research|scientists?|science says|university|univ\.|college|NEJM)\b|מחקר|מדענ|אוניברסיט|מכללת|המדע אומר/i;

describe('Instagram post calendar: no unsourced claims', () => {
  it.each(all)('$id ships an image that exists and is not retired', ({ image }) => {
    expect(existsSync(join(PROMO_DIR, image))).toBe(true);
    expect(RETIRED_CLAIM_IMAGES).not.toContain(image);
  });

  it.each(all)('$id caption carries no stat or study claim', ({ caption }) => {
    expect(caption).not.toMatch(STAT);
    expect(caption).not.toMatch(STUDY);
  });

  it('the cron route and the publisher script read the shared calendar, not their own copy', () => {
    for (const file of ['app/api/cron/instagram-post/route.ts', 'scripts/instagram-publisher.ts']) {
      const src = readFileSync(join(process.cwd(), file), 'utf8');
      expect(src).toContain('lib/instagram/postCalendar');
      for (const retired of RETIRED_CLAIM_IMAGES) expect(src).not.toContain(retired);
    }
  });

  it('the known unsourced figures are gone from the paste guide', () => {
    const guide = readFileSync(join(PROMO_DIR, 'ready-to-post/PASTE-GUIDE.md'), 'utf8');
    for (const claim of ['23%', '48%', '42,500', '12,500', 'Michigan', 'מישיגן', 'Einstein', 'איינשטיין']) {
      expect(guide).not.toContain(claim);
    }
  });
});
