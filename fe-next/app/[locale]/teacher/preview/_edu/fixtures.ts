import type { LessonClaimsView } from '@/shared/types/lessonClaims';
import type { LetterGrid } from '@/shared/types/game';

export const LONG_NAME = { en: 'Maximiliana-Josefina', he: 'אלכסנדרה-מקסימיליאנה' } as const;

export interface PreviewFixture {
  me: string;
  rival: string;
  shortRival: string;
  classmates: string[];
  words: string[];
  grid: string[][];
  className: string;
}

const EN: PreviewFixture = {
  me: 'Noa',
  rival: LONG_NAME.en,
  shortRival: 'Dana',
  classmates: ['Itamar', 'Yasmin', 'Oliver', 'Shira', 'Ben'],
  words: ['photon', 'gravity', 'magnet', 'orbit', 'friction', 'neutron', 'voltage', 'circuit', 'prism', 'energy', 'atom', 'thermometer'],
  grid: [
    ['P', 'H', 'O', 'T', 'N'],
    ['R', 'I', 'S', 'M', 'E'],
    ['G', 'A', 'V', 'O', 'U'],
    ['E', 'T', 'R', 'B', 'L'],
    ['N', 'Y', 'C', 'I', 'D'],
  ],
  className: '7B Science - Physics unit',
};

const HE: PreviewFixture = {
  me: 'נועה',
  rival: LONG_NAME.he,
  shortRival: 'דנה',
  classmates: ['איתמר', 'יסמין', 'אוליבר', 'שירה', 'בן'],
  words: ['מגנט', 'כוכב', 'אנרגיה', 'מעגל', 'חשמל', 'אטום', 'מסלול', 'חיכוך', 'מנסרה', 'כבידה', 'מתח', 'מדחום'],
  grid: [
    ['מ', 'ג', 'נ', 'ט', 'ר'],
    ['כ', 'ו', 'כ', 'ב', 'ש'],
    ['א', 'נ', 'ר', 'ג', 'י'],
    ['ה', 'מ', 'ע', 'ל', 'ח'],
    ['ת', 'ס', 'ד', 'פ', 'ק'],
  ],
  className: 'ז׳2 מדעים - יחידת פיזיקה',
};

export function fixtureFor(language: string): PreviewFixture {
  return language === 'he' ? HE : EN;
}

export function gridOf(f: PreviewFixture): LetterGrid {
  return f.grid as unknown as LetterGrid;
}

/** 12 words, the first `claimed` taken: one by me, the rest by classmates. */
export function raceView(f: PreviewFixture, claimed: number, mineIndex = 1): LessonClaimsView {
  const emojis = ['🦊', '🐙', '🐸', '🦄', '🐯', '🐼'];
  const slots = f.words.map((word, index) => {
    const chars = Array.from(word);
    const taken = index < claimed;
    const by = index === mineIndex ? f.me : index === 0 ? f.rival : f.classmates[index % f.classmates.length];
    return {
      index,
      first: chars[0].toUpperCase(),
      length: chars.length,
      claim: taken ? { word: word.toUpperCase(), username: by, avatar: { emoji: emojis[index % emojis.length] }, teamId: null } : null,
    };
  });
  return { roundId: 7, total: slots.length, claimedCount: slots.filter((s) => s.claim).length, slots };
}
