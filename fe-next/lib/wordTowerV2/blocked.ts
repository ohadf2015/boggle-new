/**
 * Words that must never become a floor. The dictionaries are big word lists,
 * not curated for a party game: Hebrew accepted מזוין (technically "armed",
 * read by every player as the vulgar slang), and a floor is shown to rivals
 * and shared. Whole-word match only, so "shitake" still builds.
 *
 * ponytail: a short hand list per language, not a profanity service. Grow it
 * when a report comes in.
 */
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
const norm = (w: string) => w.toLowerCase().replace(/[ךםןףץ]/g, (c) => FINALS[c]);

const LIST = [
  // he
  'זין', 'זיון', 'זיין', 'לזיין', 'מזוין', 'מזוינת', 'מזוינים', 'מזוינות', 'זונה', 'זונות', 'שרמוטה', 'שרמוטות', 'מניאק', 'מניאקים', 'חרא',
  // en
  'fuck', 'fucks', 'fucked', 'fucker', 'shit', 'shits', 'cunt', 'cunts', 'bitch', 'whore', 'slut', 'dick', 'dicks', 'cock', 'cocks', 'twat', 'wank', 'fag', 'rape',
  // es
  'puta', 'putas', 'puto', 'putos', 'mierda', 'joder', 'coño', 'polla', 'verga', 'pendejo', 'cabron', 'cabrón', 'culero', 'marica',
  // sv
  'fitta', 'kuk', 'kukar', 'knulla', 'hora', 'horor',
  // ru
  'хуй', 'хуя', 'пизда', 'блять', 'бля', 'ебать', 'сука', 'мудак', 'шлюха',
];

const BLOCKED = new Set(LIST.map(norm));

export function isBlockedWord(word: string): boolean {
  return BLOCKED.has(norm(word));
}
