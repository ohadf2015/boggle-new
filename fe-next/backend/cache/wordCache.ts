import { getCacheClient } from './redisCache';

const WORD_KEY = (lang: string, word: string) =>
  `word:${lang}:${word.toLowerCase()}`;
const WORD_TTL = 86400; // 24 hours

export async function getCachedWordValidation(
  lang: string,
  word: string
): Promise<boolean | null> {
  const redis = getCacheClient();
  try {
    const result = await redis.get(WORD_KEY(lang, word));
    if (result === null) return null;
    return result === '1';
  } catch {
    return null;
  }
}

export async function setCachedWordValidation(
  lang: string,
  word: string,
  isValid: boolean
): Promise<void> {
  const redis = getCacheClient();
  try {
    await redis.setex(WORD_KEY(lang, word), WORD_TTL, isValid ? '1' : '0');
  } catch {
    /* non-fatal */
  }
}
