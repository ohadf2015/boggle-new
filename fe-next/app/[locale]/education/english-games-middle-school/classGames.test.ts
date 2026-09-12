/**
 * Middle-school class games must be teen ESL, not a title-swap of elementary.
 *
 * PR #1003 shipped six games on three landings. Elementary and adults already
 * diverge. Middle-school EN titles changed (Prefix Swap Race, Debate the Gloss)
 * while setup/rules/drills stayed the primary copy (picture cards, CVC, "a child
 * draws"). This file pins the quality bar: copy-diff vs elementary, not vibes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';
import { NO_DEVICE } from '@/components/education/ClassGameList';
import { CLASSROOM_GAME_MODES } from '@/shared/types/vocabQuiz';
import { BASE_PRACTICE_MODES } from '@/lib/education/practicePicker';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';
import { getMiddleSchoolEnglishClassGames } from './classGames';
import { getElementaryClassGames } from '../english-games-elementary/classGames';
import { getAdultsClassGames } from '../english-games-adults/classGames';

const REAL_IDS = new Set<string>([
  ...CLASSROOM_GAME_MODES,
  ...BASE_PRACTICE_MODES,
  ...VOCAB_FOCUSES,
  NO_DEVICE,
]);

const PRIMARY_LEAK =
  /picture cards?|\bcvc\b|\ba child\b|\bchildren\b|short-vowel|whisper|freeze on your clap/i;

const TEEN_THEMES: Array<{ name: string; re: RegExp }> = [
  { name: 'Prefix Swap Race', re: /prefix/i },
  { name: 'Debate the Gloss', re: /gloss/i },
  { name: 'Root Grid Sprint', re: /\broot/i },
  { name: 'Peer Coach Pair', re: /register|coach/i },
  { name: 'Homophone Trap', re: /homophone/i },
  { name: 'Annotate the Board', re: /annotat|prefix|root|gloss/i },
];

function significant(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function wordOverlap(a: string, b: string): number {
  const A = significant(a);
  const B = significant(b);
  const inter = [...A].filter((w) => B.has(w)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

function pedagogyBlob(section: ReturnType<typeof getMiddleSchoolEnglishClassGames>): string {
  return section.games.map((g) => `${g.setup} ${g.rules} ${g.drills}`).join(' ');
}

const floor = (locale: string, latin: number) => (locale === 'ja' ? Math.round(latin * 0.55) : latin);

describe('middle-school class games are teen ESL, not elementary title-swap', () => {
  const en = getMiddleSchoolEnglishClassGames('en');

  it('keeps the six teen titles', () => {
    expect(en.games.map((g) => g.name)).toEqual(TEEN_THEMES.map((t) => t.name));
  });

  it('does not leak primary-school setup, rules, or drills into English copy', () => {
    const blob = `${en.intro} ${pedagogyBlob(en)}`;
    expect(blob).not.toMatch(PRIMARY_LEAK);
  });

  it('each English game’s setup+rules+drills match its teen title', () => {
    en.games.forEach((g, i) => {
      const theme = TEEN_THEMES[i];
      expect(g.name).toBe(theme.name);
      expect(`${g.setup} ${g.rules} ${g.drills}`).toMatch(theme.re);
    });
  });

  it('copy-diff vs elementary is at least the elementary-vs-adults bar', () => {
    const middle = pedagogyBlob(en);
    const elementary = pedagogyBlob(getElementaryClassGames('en'));
    const adults = pedagogyBlob(getAdultsClassGames('en'));
    const middleVsElem = wordOverlap(middle, elementary);
    const adultsVsElem = wordOverlap(adults, elementary);
    expect(middleVsElem).toBeLessThanOrEqual(adultsVsElem);
  });

  it('stays under 500 lines', () => {
    const src = fs.readFileSync(path.join(__dirname, 'classGames.ts'), 'utf8');
    expect(src.split('\n').length).toBeLessThan(500);
  });
});

describe.each([...locales])('middle-school class games — %s', (locale) => {
  const section = getMiddleSchoolEnglishClassGames(locale);

  it('has six filled games', () => {
    expect(section.games).toHaveLength(6);
    expect(section.heading.trim().length).toBeGreaterThan(10);
    expect(section.intro.trim().length).toBeGreaterThan(floor(locale, 80));
    for (const g of section.games) {
      expect(g.name.trim().length).toBeGreaterThan(3);
      expect(g.setup.trim().length).toBeGreaterThan(floor(locale, 15));
      expect(g.rules.trim().length).toBeGreaterThan(floor(locale, 60));
      expect(g.time.trim().length).toBeGreaterThan(0);
      expect(g.groupSize.trim().length).toBeGreaterThan(0);
      expect(g.drills.trim().length).toBeGreaterThan(0);
      expect(g.runsWithNote.trim().length).toBeGreaterThan(floor(locale, 20));
    }
  });

  it('names only real modes, or says no device is needed', () => {
    const invented = section.games
      .filter((g) => !REAL_IDS.has(g.runsWith))
      .map((g) => `${g.name}: ${g.runsWith}`);
    expect(invented).toEqual([]);
  });

  it('is written natively, not left in English', () => {
    if (locale === 'en') return;
    const english = getMiddleSchoolEnglishClassGames('en');
    expect(section.heading).not.toBe(english.heading);
    expect(section.intro).not.toBe(english.intro);
    section.games.forEach((g, i) => {
      expect(g.name).not.toBe(english.games[i].name);
      expect(g.setup).not.toBe(english.games[i].setup);
      expect(g.rules).not.toBe(english.games[i].rules);
    });
  });

  it('does not keep CVC or picture-card primary copy', () => {
    const blob = `${section.intro} ${pedagogyBlob(section)}`;
    expect(blob).not.toMatch(/\bCVC\b/);
    expect(blob.toLowerCase()).not.toMatch(/picture cards?/);
  });
});
