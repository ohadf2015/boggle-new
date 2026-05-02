import { BOT_CONFIG } from '@/backend/modules/botConfig';

type Language = 'en' | 'he' | 'sv' | 'ja' | 'es';

export function suggestPlayerName(language: Language | string = 'en'): string {
  const pool =
    BOT_CONFIG.PLAYER_NAMES[language as Language] ?? BOT_CONFIG.PLAYER_NAMES.en;
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return entry.name;
}
