import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { WHEEL_V3_SOURCES } from '@/utils/dailyChallenge/wordWheelSources';
import { shuffleInPlace } from '@/utils/dailyChallenge/wordWheelLetters';
import { loadWordChecker } from '@/lib/server/dictionarySet';
import type { Language } from '@/shared/types/game';
import type { ArcadeGameId } from './games';
import type { ArcadeContentMap } from './content';
import { fold } from './letters';
import { huntWords, themedWords } from './wordPool.server';

type Rng = () => number;
type IsWord = (w: string) => boolean;

const PAD: Record<string, string> = {
  en: 'EAIOTNSRL', es: 'EAOSRNIL', sv: 'EANRTSLI', ru: 'ОЕАИНТС', he: 'יוהאלמר', ja: 'いうかしたなん',
};

const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)];
const chars = (w: string) => [...w];

function pad(letters: string[], size: number, lang: string, r: Rng): string[] {
  const pool = chars(PAD[lang] ?? PAD.en);
  const out = letters.slice(0, size);
  while (out.length < size) out.push(pick(r, pool));
  return out;
}

function byLength(lang: string, min: number, max: number): string[] {
  const words = huntWords(lang).filter((w) => chars(w).length >= min && chars(w).length <= max);
  return words.length ? words : huntWords(lang);
}

function scramble(word: string, r: Rng): string[] {
  const letters = chars(word);
  for (let i = 0; i < 6; i++) {
    shuffleInPlace(letters, r);
    if (letters.join('') !== word) break;
  }
  return letters;
}

function mutate(word: string, lang: string, r: Rng): string {
  const letters = chars(word);
  const pool = chars(PAD[lang] ?? PAD.en);
  const i = Math.floor(r() * letters.length);
  if (r() < 0.5 && letters.length > 3) {
    const j = (i + 1) % letters.length;
    [letters[i], letters[j]] = [letters[j], letters[i]];
  } else {
    letters[i] = pick(r, pool.filter((p) => p !== letters[i]));
  }
  return letters.join('');
}

const small = (lang: string) => (lang === 'ja' || lang === 'he' ? 2 : 3);

const builders: { [G in ArcadeGameId]: (lang: string, r: Rng, isWord: IsWord) => ArcadeContentMap[G] } = {
  oil: (lang, r) => {
    const sources = WHEEL_V3_SOURCES[lang as Language] ?? WHEEL_V3_SOURCES.en;
    const size = lang === 'ja' ? 7 : 9;
    return { rack: shuffleInPlace(pad(chars(fold(pick(r, sources), lang)), size, lang, r), r) };
  },
  dreidel: (lang, r) => {
    const words = byLength(lang, lang === 'ja' ? 3 : 5, 7);
    const botWords: string[] = [];
    const racks = Array.from({ length: 16 }, () => {
      const w = pick(r, words);
      botWords.push(w);
      return shuffleInPlace(pad(chars(w), Math.max(7, chars(w).length), lang, r), r);
    });
    return { racks, botWords, spins: Array.from({ length: 40 }, () => Math.floor(r() * 4)) };
  },
  sufganiyah: (lang, r) => {
    const letters = chars(byLength(lang, small(lang), 6).join(''));
    return { drops: Array.from({ length: 240 }, () => ({ letter: pick(r, letters), col: Math.floor(r() * 6) })) };
  },
  sleigh: (lang, r) => {
    const words = byLength(lang, small(lang), lang === 'ja' ? 4 : 5);
    return {
      chimneys: Array.from({ length: 40 }, () => {
        const w = chars(pick(r, words));
        return shuffleInPlace(pad(w, Math.min(6, Math.max(4, w.length + 1)), lang, r), r);
      }),
    };
  },
  snowball: (lang, r, isWord) => {
    const words = byLength(lang, small(lang) + 1, 7);
    const known = new Set(words);
    return {
      balls: Array.from({ length: 70 }, () => {
        const real = pick(r, words);
        if (r() < 0.6) return { text: real, real: true };
        for (let tries = 0; tries < 8; tries++) {
          const fake = mutate(real, lang, r);
          if (!known.has(fake) && !isWord(fake.toLowerCase()) && !isWord(fake)) return { text: fake, real: false };
        }
        return { text: real, real: true };
      }),
    };
  },
  wrap: (lang, r) => {
    const words = byLength(lang, small(lang) + 1, 7);
    const themed = themedWords(lang).filter((w) => chars(w).length >= 3 && chars(w).length <= 9);
    return {
      gifts: Array.from({ length: 36 }, (_, i) => {
        const mystery = (i + 1) % 5 === 0 && themed.length > 0;
        return { letters: scramble(mystery ? pick(r, themed) : pick(r, words), r), mystery };
      }),
    };
  },
};

export async function buildContent<G extends ArcadeGameId>(game: G, lang: string, seed: number, isWord?: IsWord): Promise<ArcadeContentMap[G]> {
  const check = isWord ?? (game === 'snowball' ? (await loadWordChecker(lang)) ?? (() => false) : () => false);
  return builders[game](lang, mulberry32(seed), check);
}
