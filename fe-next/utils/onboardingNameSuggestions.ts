import { BOT_CONFIG } from '@/backend/modules/botConfig';
import { isDefaultPlayerName } from './defaultPlayerNames';

type Language = 'en' | 'he' | 'sv' | 'ja' | 'es';

// Anything that's not a letter, digit, or whitespace must go — the profile
// input rejects apostrophes (ASCII or Hebrew geresh), em-dashes, and other
// punctuation, so a suggested default that contains them lands in an invalid
// state. Strip them and collapse extra spaces so the user always starts valid.
function sanitize(name: string): string {
  return name.replace(/[^\p{L}\p{N}\s]+/gu, '').replace(/\s+/g, ' ').trim();
}

export function suggestPlayerName(language: Language | string = 'en'): string {
  const pool =
    BOT_CONFIG.PLAYER_NAMES[language as Language] ?? BOT_CONFIG.PLAYER_NAMES.en;
  // Up to a few attempts for a clean entry; fall back to sanitized first.
  for (let i = 0; i < 6; i++) {
    const entry = pool[Math.floor(Math.random() * pool.length)];
    const cleaned = sanitize(entry.name);
    if (cleaned.length >= 1 && cleaned.length <= 20) return cleaned;
  }
  return sanitize(pool[0]?.name ?? 'Player');
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * A one-tap name that can show on public boards: the first word of one pool
 * name with the last word of another, so it is never a name we hand out.
 */
export function suggestPublicPlayerName(language: Language | string = 'en'): string {
  const pool = (BOT_CONFIG.PLAYER_NAMES[language as Language] ?? BOT_CONFIG.PLAYER_NAMES.en).map((e) => sanitize(e.name));
  const spaced = pool.filter((n) => n.includes(' '));
  for (let i = 0; i < 20; i++) {
    const name = spaced.length > 1
      ? `${pick(spaced).split(' ')[0]} ${pick(spaced).split(' ').slice(-1)[0]}`
      : `${pick(pool)}${pick(pool).slice(-2)}`;
    if (name.length >= 2 && name.length <= 20 && !isDefaultPlayerName(name)) return name;
  }
  return `${sanitize(pool[0] ?? 'Word')} ${Math.floor(Math.random() * 90 + 10)}X`.slice(0, 20);
}
