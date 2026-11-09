/**
 * Chat profanity filter for every language LexiClash ships (en, he, es, sv, ru, ja).
 *
 * Chat only: game-word validation keeps using profanityFilter.isProfane, so a
 * valid dictionary word is never rejected from a board because of this list.
 *
 * Matching rules, chosen to avoid the classic false positives:
 * - Space-separated languages match whole tokens after trimming punctuation and
 *   collapsing letter runs ("fuuuck" → "fuck").
 * - Hebrew also tries the token without one attached prefix letter (ו/ה/ב/ל/מ/ש/כ).
 * - Russian matches a few roots only at the START of a token ("пизд…"), never
 *   inside one ("употребляют" contains "бля").
 * - Japanese has no spaces, so it matches a short list of unambiguous substrings
 *   (no "くそ", which sits inside "やくそく").
 */
import Filter from 'bad-words';

const englishList: string[] = (new Filter() as unknown as { list: string[] }).list;

const EXACT = new Set<string>([
  ...englishList.map((w) => w.toLowerCase()),
  // Hebrew
  'זין', 'כוס', 'כוסית', 'זונה', 'זונות', 'שרמוטה', 'שרמוטות', 'מזדיין', 'מזדיינת', 'לזיין', 'תזדיין', 'תזדייני',
  'מניאק', 'מניאקית', 'חרא', 'כוסאמק', 'כוסעמק', 'כוסאמא', 'יבן', 'בנזונה', 'קוקסינל',
  // Spanish
  'puta', 'putas', 'puto', 'putos', 'mierda', 'joder', 'jodete', 'coño', 'cono', 'cabrón', 'cabron', 'cabrona',
  'pendejo', 'pendeja', 'gilipollas', 'maricón', 'maricon', 'verga', 'chingar', 'chingada', 'chingado',
  'culero', 'hijueputa', 'hijoputa', 'zorra', 'polla', 'mamón', 'mamon', 'carajo',
  // Swedish
  'jävla', 'javla', 'jävlar', 'jävel', 'fitta', 'fittan', 'kuk', 'kuken', 'hora', 'horan', 'horunge',
  'knulla', 'knullar', 'knullade', 'rövhål', 'rovhal', 'subba', 'fittkärring',
  // Russian (exact forms; roots below)
  'бля', 'блять', 'блядь', 'бляди', 'сука', 'суки', 'сучка', 'мудак', 'мудаки', 'говно', 'гондон', 'шлюха', 'нахуй', 'похуй',
]);

const RU_ROOTS = ['хуй', 'хуе', 'хуё', 'хуя', 'пизд', 'ебан', 'ёбан', 'ебат', 'заеб', 'наеб', 'выеб', 'уеб', 'еблан', 'блядс', 'мудил'];

const JA_SUBSTRINGS = ['ちんこ', 'ちんぽ', 'まんこ', 'チンコ', 'マンコ', 'セックス', '死ね', 'しねよ', '殺すぞ', 'ころすぞ', 'クソ野郎', 'くそやろう', 'ファック'];

const HE_PREFIXES = new Set(['ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ']);

const EDGE_PUNCT = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(EDGE_PUNCT, '')
    .normalize('NFC');
}

function variants(token: string): string[] {
  const out = [token];
  // Stretched letters: "fuuuuck" → "fuck". Only runs of 3+, so "good" stays "good".
  const collapsed = token.replace(/(\p{L})\1{2,}/gu, '$1');
  if (collapsed !== token) out.push(collapsed);
  if (token.length > 2 && HE_PREFIXES.has(token[0])) out.push(token.slice(1));
  return out;
}

/** True when one whitespace-separated token is a chat profanity. */
export function isProfaneToken(raw: string): boolean {
  const token = normalizeToken(raw);
  if (!token) return false;
  for (const v of variants(token)) {
    if (EXACT.has(v)) return true;
    if (RU_ROOTS.some((root) => v.startsWith(root))) return true;
  }
  return false;
}

/** True when the text holds any chat profanity in any supported language. */
export function isChatProfane(text: string | null | undefined): boolean {
  if (!text) return false;
  if (JA_SUBSTRINGS.some((s) => text.includes(s))) return true;
  return text.split(/\s+/).some(isProfaneToken);
}

/** Stars the letters of a token, keeping punctuation at its edges ("pendejo," → "*******,"). */
function starCore(part: string): string {
  const m = part.match(/^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/su);
  if (!m) return '*'.repeat([...part].length);
  return m[1] + '*'.repeat([...m[2]].length) + m[3];
}

/** Stars out profane tokens (and Japanese substrings), keeping spacing intact. */
export function cleanChatProfanity(text: string | null | undefined): string {
  if (!text) return text || '';
  let out = text
    .split(/(\s+)/)
    .map((part) => (part.trim() && isProfaneToken(part) ? starCore(part) : part))
    .join('');
  for (const s of JA_SUBSTRINGS) {
    if (out.includes(s)) out = out.split(s).join('*'.repeat([...s].length));
  }
  return out;
}
