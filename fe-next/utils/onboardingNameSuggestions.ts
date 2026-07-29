import { BOT_CONFIG } from '@/backend/modules/botConfig';

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
