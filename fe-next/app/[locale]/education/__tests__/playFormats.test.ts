/**
 * "N ways to play one word list" must be counted, and every row must be real.
 *
 * The number of formats is the one scale claim on these pages that changes without
 * anyone touching marketing: the live vocab quiz shipped while the copy still
 * described four classroom modes. So the count comes from the registries, and this
 * test also pins those registries to the two places that actually enforce them —
 * the wizard component and the socket handler's Zod enum — because an exported
 * array that silently disagrees with the wizard is worse than no array at all.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLASSROOM_GAME_MODES } from '@/shared/types/vocabQuiz';
import { BASE_PRACTICE_MODES } from '@/lib/education/practicePicker';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';
import { getVocabClassroomContent } from '../vocabulary-games-classroom/content';
import { getEslWordGamesContent } from '../esl-word-games/content';
import {
  playFormats,
  PLAY_FORMAT_COUNT,
  LIVE_MODE_COUNT,
  PRACTICE_FORMAT_COUNT,
} from '@/lib/education/playFormats';

const FE_NEXT = join(__dirname, '..', '..', '..', '..');
const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;

describe('the registries agree with the code that enforces them', () => {
  const wizard = readFileSync(
    join(FE_NEXT, 'components', 'education', 'ClassroomModeSettings.tsx'),
    'utf8',
  );
  const handler = readFileSync(
    join(FE_NEXT, 'backend', 'handlers', 'classroomGameHandler.ts'),
    'utf8',
  );

  it.each(CLASSROOM_GAME_MODES)('%s is offered by the classroom wizard', (mode) => {
    expect(wizard).toContain(`key: '${mode}'`);
  });

  it.each(CLASSROOM_GAME_MODES)('%s is accepted by the socket handler', (mode) => {
    expect(handler).toContain(`'${mode}'`);
  });

  it('the wizard offers no mode the registry omits', () => {
    const offered = [...wizard.matchAll(/\{ key: '([a-z-]+)', icon:/g)].map((m) => m[1]);
    expect(offered.sort()).toEqual([...CLASSROOM_GAME_MODES].sort());
  });
});

describe('the count is derived', () => {
  it('equals live modes + base practice modes + vocab focuses', () => {
    expect(PLAY_FORMAT_COUNT).toBe(
      CLASSROOM_GAME_MODES.length + BASE_PRACTICE_MODES.length + VOCAB_FOCUSES.length,
    );
  });

  it('is the 5 + 7 + 6 the code currently ships', () => {
    expect(LIVE_MODE_COUNT).toBe(5);
    expect(PRACTICE_FORMAT_COUNT).toBe(13);
    expect(PLAY_FORMAT_COUNT).toBe(18);
  });
});

describe.each(LOCALES)('%s format rows', (locale) => {
  const { live, practice } = playFormats(locale);

  it('has one row per registry entry', () => {
    expect(live).toHaveLength(CLASSROOM_GAME_MODES.length);
    expect(practice).toHaveLength(BASE_PRACTICE_MODES.length + VOCAB_FOCUSES.length);
  });

  it('every row has a name and a description', () => {
    const blank = [...live, ...practice]
      .filter((f) => !f.name.trim() || !f.note.trim())
      .map((f) => f.id);
    expect(blank).toEqual([]);
  });

  it('rows are localized — non-English differs from English', () => {
    if (locale === 'en') return;
    const enRows = playFormats('en');
    const rows = [...live, ...practice];
    const enAll = [...enRows.live, ...enRows.practice];
    // Product names may legitimately stay English (Blast, Word Hunt). The
    // descriptions are prose and must not be.
    const untranslated = rows.filter((f, i) => f.note === enAll[i].note).map((f) => f.id);
    expect(untranslated).toEqual([]);
  });
});

describe('the section copy', () => {
  const pages = [
    ['vocabulary-games-classroom', getVocabClassroomContent('en').playFormats],
    ['esl-word-games', getEslWordGamesContent('en').playFormats],
  ] as const;

  it.each(pages)('%s intro is quotable on its own — 40 to 60 words', (_page, copy) => {
    // Placeholders stand in for one word each, which is what a reader sees.
    const words = copy.intro.trim().split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
  });

  it.each(pages)('%s never hardcodes the format count', (_page, copy) => {
    // The count changes when a mode ships. It must arrive as a placeholder.
    for (const field of [copy.heading, copy.intro, copy.liveLabel, copy.practiceLabel]) {
      expect(field).not.toMatch(new RegExp(`\\b${PLAY_FORMAT_COUNT}\\b`));
      expect(field).not.toMatch(new RegExp(`\\b${LIVE_MODE_COUNT}\\b`));
    }
    expect(copy.heading).toContain('{count}');
  });
});
