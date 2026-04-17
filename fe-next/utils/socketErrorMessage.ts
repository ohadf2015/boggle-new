/**
 * Translates backend socket 'error' event payloads to localized strings.
 *
 * Backend emits `{ code: ErrorCode, message: string }` where `message` is English
 * (from ErrorRegistry). The frontend maps `code` → `socketErrors.<CODE>` translation
 * key, falling back to backend `message` (English) and then a generic key.
 */

export interface SocketErrorPayload {
  code?: string;
  message?: string;
}

type Translator = (key: string) => string;

export function socketErrorMessage(
  payload: SocketErrorPayload | string | undefined,
  t: Translator
): string {
  if (typeof payload === 'string') return payload;
  if (!payload) return t('common.errorOccurred') || 'An error occurred';

  if (payload.code) {
    const key = `socketErrors.${payload.code}`;
    const translated = t(key);
    // Treat "echo of key" (no translation found) as miss.
    if (translated && translated !== key) return translated;
  }

  if (payload.message) return payload.message;

  return t('common.errorOccurred') || 'An error occurred';
}

/**
 * Heuristic for bot-related errors. Prefers code prefix; keeps substring
 * fallback for legacy backend sites still emitting raw English strings.
 */
export function isBotErrorCode(payload: SocketErrorPayload | string | undefined): boolean {
  if (!payload) return false;
  if (typeof payload === 'string') return payload.toLowerCase().includes('bot');
  if (payload.code?.startsWith('BOT_')) return true;
  return !!payload.message && payload.message.toLowerCase().includes('bot');
}
