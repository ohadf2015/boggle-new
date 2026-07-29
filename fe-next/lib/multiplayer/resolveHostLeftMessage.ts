/**
 * Resolves the user-facing string for `hostLeftRoomClosing` and `hostDisconnected`
 * socket events. Audit 2026-05-10 found that server-side broadcasts emit English
 * `data.message` strings that leaked into HE/SV/JA/ES locales because the client
 * resolved as `data.message || t(default)` — the truthy English string always won.
 *
 * Resolution order:
 *   1. `data.i18nKey` (preferred) — translated with `data.i18nParams` if any.
 *      If `t()` returns the key unchanged (untranslated), fall through.
 *   2. `data.message` (legacy / wire-level fallback) — used as-is.
 *   3. `t(defaultKey)` — last-resort generic message.
 */
type Translator = (key: string, params?: Record<string, string | number>) => string;

interface HostLeftPayload {
  message?: string;
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
}

export function resolveHostLeftMessage(
  data: HostLeftPayload,
  t: Translator,
  defaultKey: string,
): string {
  if (data.i18nKey) {
    const translated = t(data.i18nKey, data.i18nParams);
    if (translated && translated !== data.i18nKey) return translated;
  }
  if (data.message) return data.message;
  if (defaultKey) return t(defaultKey);
  return '';
}
