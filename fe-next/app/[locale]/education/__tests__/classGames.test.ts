/**
 * The ten-game lists must stay true and stay distinct.
 *
 * These lists exist because four rounds of blind comparison said the same thing: the
 * queries are informational, the reader wants games with setup and rules, and a
 * product pitch loses to a printable listicle every time. A list is only worth
 * publishing if a teacher can trust it, so the two risks it introduces are pinned
 * here.
 *
 * Risk one: inventing a product feature to make a classic game sound like ours.
 * `runsWith` must be a real id from `CLASSROOM_GAME_MODES`, `BASE_PRACTICE_MODES` or
 * `VOCAB_FOCUSES`, or the explicit `NO_DEVICE`. A mode renamed in code breaks this
 * test rather than quietly misleading a reader.
 *
 * Risk two: two near-identical lists on two indexed pages, which is the doorway
 * pattern `variantDifferentiation.test.ts` already guards for the meta descriptions.
 */
import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';
import { NO_DEVICE } from '@/components/education/ClassGameList';
import { CLASSROOM_GAME_MODES } from '@/shared/types/vocabQuiz';
import { BASE_PRACTICE_MODES } from '@/lib/education/practicePicker';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';
import { getVocabClassGames } from '../vocabulary-games-classroom/classGames';
import { getEslClassGames } from '../esl-word-games/classGames';

const REAL_IDS = new Set<string>([
  ...CLASSROOM_GAME_MODES,
  ...BASE_PRACTICE_MODES,
  ...VOCAB_FOCUSES,
  NO_DEVICE,
]);

const PAGES: Array<[string, (l: string) => ReturnType<typeof getVocabClassGames>]> = [
  ['vocabulary-games-classroom', getVocabClassGames],
  ['esl-word-games', getEslClassGames],
];

describe.each(PAGES)('%s — ten games, every locale', (_page, get) => {
  /**
   * Character floors are script-dependent. Japanese writes the same instruction
   * without spaces and with one character per morpheme, so "リストを開くだけです。"
   * is a complete setup line at 11 characters where the English is 24. A flat floor
   * would push a translator to pad copy to satisfy a test, which is backwards.
   */
  const floor = (locale: string, latin: number) => (locale === 'ja' ? Math.round(latin * 0.55) : latin);

  it.each([...locales])('%s has exactly ten games with every field filled', (locale) => {
    const section = get(locale);
    expect(section.games).toHaveLength(10);
    expect(section.heading.trim().length).toBeGreaterThan(10);
    expect(section.intro.trim().length).toBeGreaterThan(floor(locale, 80));
    for (const label of Object.values(section.labels)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
    for (const g of section.games) {
      expect(g.name.trim().length).toBeGreaterThan(3);
      expect(g.setup.trim().length).toBeGreaterThan(floor(locale, 15));
      // Two or three lines of rules — long enough to actually run the game.
      expect(g.rules.trim().length).toBeGreaterThan(floor(locale, 60));
      expect(g.time.trim().length).toBeGreaterThan(0);
      expect(g.groupSize.trim().length).toBeGreaterThan(0);
      expect(g.drills.trim().length).toBeGreaterThan(0);
      expect(g.runsWithNote.trim().length).toBeGreaterThan(floor(locale, 20));
    }
  });

  it.each([...locales])('%s names only real modes, or says no device is needed', (locale) => {
    const invented = get(locale)
      .games.filter((g) => !REAL_IDS.has(g.runsWith))
      .map((g) => `  ${g.name}: runsWith "${g.runsWith}" is in no registry`);
    expect(invented.join('\n') || null).toBeNull();
  });

  it.each([...locales])('%s keeps a no-device game honest about needing nothing', (locale) => {
    // A NO_DEVICE game must not claim a LexiClash mode runs it; the note is there to
    // say the opposite. This is the assertion that stops the list becoming a pitch.
    for (const g of get(locale).games.filter((x) => x.runsWith === NO_DEVICE)) {
      for (const mode of CLASSROOM_GAME_MODES) {
        expect(g.runsWithNote.toLowerCase()).not.toContain(String(mode));
      }
    }
  });

  it.each([...locales])('%s is written natively, not left in English', (locale) => {
    if (locale === 'en') return;
    const mine = get(locale);
    const english = get('en');
    expect(mine.heading).not.toBe(english.heading);
    expect(mine.intro).not.toBe(english.intro);
    mine.games.forEach((g, i) => {
      expect(g.rules).not.toBe(english.games[i].rules);
      expect(g.setup).not.toBe(english.games[i].setup);
    });
  });

  it('lists games that need no device at all', () => {
    // The credibility of the list rests on it not bending every classic game into a
    // product feature. If this drops to zero, the page is drifting back into a pitch.
    // Two, not five: the first draft's intro claimed five and this assertion is what
    // caught the discrepancy, so the number here is counted, never aspirational.
    const noDevice = get('en').games.filter((g) => g.runsWith === NO_DEVICE);
    expect(noDevice.length).toBeGreaterThanOrEqual(2);
  });

  it.each([...locales])('%s marks the same games as needing no device', (locale) => {
    // The marker must survive translation: a locale that silently dropped it would
    // tell that reader a classic paper game needs our product.
    const english = get('en').games.map((g) => g.runsWith);
    expect(get(locale).games.map((g) => g.runsWith)).toEqual(english);
  });
});

describe('the two lists are different lists (anti-doorway)', () => {
  const significant = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3));

  it('no game name is shared between the pages', () => {
    const vocab = getVocabClassGames('en').games.map((g) => g.name);
    const esl = getEslClassGames('en').games.map((g) => g.name);
    expect(vocab.filter((n) => esl.includes(n))).toEqual([]);
  });

  it('game names share no significant word', () => {
    const vocabWords = new Set<string>();
    for (const g of getVocabClassGames('en').games) for (const w of significant(g.name)) vocabWords.add(w);
    const shared: string[] = [];
    for (const g of getEslClassGames('en').games) {
      for (const w of significant(g.name)) if (vocabWords.has(w)) shared.push(`${g.name} → "${w}"`);
    }
    expect(shared).toEqual([]);
  });

  it('the two section headings are distinct', () => {
    expect(getVocabClassGames('en').heading).not.toBe(getEslClassGames('en').heading);
  });

  it('every locale keeps both lists at ten distinct game names', () => {
    for (const locale of locales) {
      for (const get of [getVocabClassGames, getEslClassGames]) {
        const names = get(locale).games.map((g) => g.name);
        expect(new Set(names).size).toBe(10);
      }
    }
  });
});
