/**
 * /daily (and word-wheel) still emit a real per-day Event: startDate today,
 * endDate tomorrow, @id #wordhunt-event. None of those nodes may span to 2099 —
 * that fake sitewide Event was removed from app/[locale]/layout.tsx.
 *
 * DailyLayout is a Next.js server component; the JSON-LD graph is built
 * inline, so the source of layout.tsx / word-wheel/page.tsx IS the builder.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DAILY_DIR = join(__dirname, '..');
const dailyLayout = readFileSync(join(DAILY_DIR, 'layout.tsx'), 'utf8');
const wordWheelPage = readFileSync(join(DAILY_DIR, 'word-wheel', 'page.tsx'), 'utf8');

describe('daily JSON-LD still emits a per-day Event', () => {
  it('Word Hunt layout keeps #wordhunt-event', () => {
    expect(dailyLayout).toContain('#wordhunt-event');
    expect(dailyLayout).toMatch(/['"]@type['"]\s*:\s*['"]Event['"]/);
  });

  it('Word Hunt Event startDate is today and endDate is tomorrow, never 2099', () => {
    expect(dailyLayout).toContain("startDate: today.toISOString().split('T')[0]");
    expect(dailyLayout).toContain("endDate: tomorrow.toISOString().split('T')[0]");
    expect(dailyLayout).not.toContain('2099-12-31');
    expect(dailyLayout).not.toContain("startDate: '2024-01-01'");
    expect(dailyLayout).not.toMatch(/endDate:\s*['"][^'"]*2099/);
  });

  it('word-wheel page still emits a per-day Event, none ending in 2099', () => {
    expect(wordWheelPage).toMatch(/['"]@type['"]\s*:\s*['"]Event['"]/);
    expect(wordWheelPage).toContain("startDate: today.toISOString().split('T')[0]");
    expect(wordWheelPage).toContain("endDate: tomorrow.toISOString().split('T')[0]");
    expect(wordWheelPage).not.toContain('2099-12-31');
    expect(wordWheelPage).not.toMatch(/endDate:\s*['"][^'"]*2099/);
  });
});
