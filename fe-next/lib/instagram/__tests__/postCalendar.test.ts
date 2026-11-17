import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { EN_POSTS, EN_ALT_WEEK_POSTS, HE_POSTS, RETIRED_CLAIM_IMAGES, enPostFor } from '../postCalendar';

const PROMO_DIR = join(process.cwd(), 'public/images/promo');
const all = [
  ...Object.entries(EN_POSTS).map(([d, p]) => ({ id: `en:${d}`, ...p })),
  ...Object.entries(EN_ALT_WEEK_POSTS).map(([d, p]) => ({ id: `en-alt:${d}`, ...p! })),
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

describe('enPostFor', () => {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  it('alternates between the base and alt post on alt weekdays, and keeps the base post on other days', () => {
    const monday = new Date(2026, 10, 16, 12);
    const nextMonday = new Date(monday.getTime() + WEEK);
    const pair = [enPostFor(monday)?.image, enPostFor(nextMonday)?.image].sort();
    expect(pair).toEqual([EN_ALT_WEEK_POSTS[1]!.image, EN_POSTS[1].image].sort());
    const tuesday = new Date(2026, 10, 17, 12);
    expect(enPostFor(tuesday)).toBe(EN_POSTS[2]);
    expect(enPostFor(new Date(tuesday.getTime() + WEEK))).toBe(EN_POSTS[2]);
  });
});
