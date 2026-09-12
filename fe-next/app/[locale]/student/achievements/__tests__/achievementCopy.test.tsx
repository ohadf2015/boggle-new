/**
 * The student achievement wall must never render a translation KEY.
 *
 * Round 3 shipped 28 cards whose titles were the literal dot-paths
 * `achievements.<key>.name` — `achievement_definitions.base_name_key` points at
 * an `achievements.*` namespace that only ever held the UPPERCASE arcade
 * achievements, so every education achievement fell through `t()` and printed
 * its own key. The category row had the same shape of bug from the other
 * direction: the "Progress" tab borrowed `education.achievements.progress`,
 * which is the *count* format `{{current}}/{{next}}` used by
 * AchievementProgressCard, so the tab rendered a raw placeholder pair.
 *
 * Both are locale-data contracts, so they are asserted against the real
 * translation modules in all six locales rather than against a mock.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

/** Every row of `achievement_definitions`, read off the live table 2026-09-11. */
const EDUCATION_ACHIEVEMENT_KEYS = [
  'first_lesson',
  'word_master',
  'level_climber',
  'xp_collector',
  'practice_veteran',
  'duel_veteran',
  'speed_demon',
  'perfect_streak',
  'boss_slayer',
  'combo_master',
  'duel_champion',
  'comeback_king',
  'speed_dueler',
  'spelling_ace',
  'matching_master',
  'blitz_champion',
  'streak_starter',
  'early_bird',
  'dedicated_learner',
  'weekly_warrior',
  'streak_champion',
  'duel_streak',
  'practice_streak',
  'mode_explorer',
  'lesson_collector',
  'classroom_contributor',
  'word_variety',
  'mode_master',
] as const;

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es, ru };

function lookup(bundle: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], bundle);
}

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (lookup(en, key) as string) ?? key,
    language: 'en',
    direction: 'ltr',
  }),
}));

describe('education achievement copy', () => {
  it('ships 28 keys — the full achievement_definitions set', () => {
    expect(EDUCATION_ACHIEVEMENT_KEYS).toHaveLength(28);
  });

  for (const [locale, bundle] of Object.entries(LOCALES)) {
    describe(locale, () => {
      it.each(EDUCATION_ACHIEVEMENT_KEYS)('resolves a real name for %s', (key) => {
        const name = lookup(bundle, `achievements.${key}.name`);
        expect(typeof name).toBe('string');
        expect(name).not.toMatch(/[{}]/);
        expect((name as string).trim().length).toBeGreaterThan(0);
        // Long titles clip under the grid's two-line clamp on a 390px phone.
        expect((name as string).length).toBeLessThanOrEqual(24);
      });

      it.each(EDUCATION_ACHIEVEMENT_KEYS)('resolves a real description for %s', (key) => {
        const description = lookup(bundle, `achievements.${key}.description`);
        expect(typeof description).toBe('string');
        expect(description).not.toMatch(/[{}]/);
        expect((description as string).trim().length).toBeGreaterThan(0);
      });

      it('keeps a placeholder-free label for every category tab', () => {
        for (const category of ['progress', 'skill', 'consistency', 'exploration']) {
          const label = lookup(bundle, `education.achievements.categories.${category}`);
          expect(typeof label).toBe('string');
          expect(label).not.toMatch(/[{}]/);
        }
        expect(lookup(bundle, 'education.achievements.all')).not.toMatch(/[{}]/);
      });
    });
  }
});

describe('AchievementGrid', () => {
  it('labels the Progress tab with a word, not the {{current}}/{{next}} count format', async () => {
    const { AchievementGrid } = await import('@/components/education/achievements/AchievementGrid');
    render(
      <AchievementGrid
        studentId="s1"
        achievements={{
          first_lesson: {
            count: 1,
            category: 'progress',
            icon: '📚',
            nameKey: 'achievements.first_lesson.name',
            descriptionKey: 'achievements.first_lesson.description',
            isSecret: false,
          },
        }}
      />,
    );

    const tabs = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(tabs.join('|')).not.toMatch(/[{}]/);
    expect(tabs).toContain(en.education.achievements.categories.progress);
    // …and the card itself shows the name, never the key.
    expect(screen.getByText(en.achievements.first_lesson.name)).toBeInTheDocument();
  });
});
