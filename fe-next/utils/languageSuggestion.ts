/**
 * Native-language suggestion logic.
 *
 * Problem this solves: a player whose top browser language is Spanish is served
 * our English app anyway — typically because a stale `boggle_language=en` cookie
 * (or an English deep link) pins the locale ahead of their `Accept-Language`.
 * Chrome then machine-translates our English UI to Spanish on the fly. The
 * result is a worse experience than our hand-crafted `es` bundle AND a flag/text
 * mismatch (real app lang = en → 🇺🇸, visible text = browser-translated Spanish).
 *
 * The fix: detect when the browser prefers a language we ship natively and
 * offer a one-tap switch to *our* translation. Once the page is genuinely in
 * their language, the browser stops auto-translating (which also avoids the
 * DOM-mutation React crashes that browser translation causes).
 *
 * These functions are intentionally pure (no `navigator`/`document`/storage
 * access) so they can be unit-tested in isolation; the hook supplies the I/O.
 */
import type { Language } from '@/shared/types/game';

/** Locales we ship native, hand-crafted translations for. */
export const SUPPORTED_SUGGESTION_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;
export type SuggestionLanguage = (typeof SUPPORTED_SUGGESTION_LANGUAGES)[number];

const SUPPORTED = new Set<string>(SUPPORTED_SUGGESTION_LANGUAGES);

/**
 * Map a BCP-47 language tag (e.g. `es-MX`, `en-GB`, legacy `iw`) to one of the
 * languages we natively support, or `null` if we don't ship that language.
 */
export function mapToSupportedLanguage(tag: string | null | undefined): SuggestionLanguage | null {
  if (!tag) return null;
  const primary = tag.toLowerCase().split(/[-_]/)[0];
  // `iw` is the deprecated ISO code for Hebrew still emitted by some browsers.
  const normalized = primary === 'iw' ? 'he' : primary;
  return SUPPORTED.has(normalized) ? (normalized as SuggestionLanguage) : null;
}

/**
 * First natively-supported language in the browser's ordered preference list
 * (`navigator.languages`). Returns `null` when none are supported.
 */
export function detectPreferredLanguage(
  navigatorLanguages: readonly string[] | undefined,
): SuggestionLanguage | null {
  if (!navigatorLanguages) return null;
  for (const tag of navigatorLanguages) {
    const lang = mapToSupportedLanguage(tag);
    if (lang) return lang;
  }
  return null;
}

interface SuggestionInput {
  /** Language the app is currently rendering. */
  current: Language;
  /** Natively-supported language the browser prefers (from detectPreferredLanguage). */
  preferred: SuggestionLanguage | null;
  /** Whether the user explicitly picked the current language (don't nag). */
  explicit: boolean;
  /** Whether the user already dismissed the suggestion for `preferred`. */
  dismissed: boolean;
  /** Whether the browser/extension is actively machine-translating the page. */
  browserTranslating: boolean;
}

/**
 * Decide whether to offer switching to the user's native language.
 * Returns the language to suggest, or `null` to stay silent.
 */
export function resolveSuggestedLanguage({
  current,
  preferred,
  explicit,
  dismissed,
  browserTranslating,
}: SuggestionInput): SuggestionLanguage | null {
  if (!preferred) return null;
  if (preferred === current) return null; // already in their language
  if (dismissed) return null; // respect a prior dismissal, always
  // If they explicitly chose the current language, stay silent — UNLESS the
  // browser is actively machine-translating, which is strong evidence that the
  // explicit pick no longer matches what they actually want to read.
  if (explicit && !browserTranslating) return null;
  return preferred;
}

/**
 * Detect an active in-browser page translation (Google Translate, Edge
 * Translator, etc.). Google Translate toggles `translated-ltr`/`translated-rtl`
 * on `<html>` and injects `.skiptranslate`/`.goog-te-*` nodes; Edge stamps
 * translated text nodes with `_msttexthash`.
 */
export function isBrowserTranslating(doc: Document | undefined | null): boolean {
  if (!doc) return false;
  const html = doc.documentElement;
  if (!html) return false;
  if (html.classList.contains('translated-ltr') || html.classList.contains('translated-rtl')) {
    return true;
  }
  return !!doc.querySelector('.goog-te-banner-frame, .skiptranslate, [_msttexthash]');
}

/** Copy for the suggestion banner, written *in the target language* so the */
/** offer is understandable to a speaker of that language. */
export interface SuggestionCopy {
  /** Autonym shown to the user (e.g. "Español", "עברית"). */
  nativeName: string;
  /** Full prompt, e.g. "¿Prefieres jugar en Español?". */
  prompt: string;
  /** Accept button label. */
  accept: string;
  /** Dismiss button accessible label. */
  dismiss: string;
}

export const SUGGESTION_COPY: Record<SuggestionLanguage, SuggestionCopy> = {
  en: { nativeName: 'English', prompt: 'Prefer to play in English?', accept: 'Switch', dismiss: 'No thanks' },
  es: { nativeName: 'Español', prompt: '¿Prefieres jugar en Español?', accept: 'Cambiar', dismiss: 'No, gracias' },
  he: { nativeName: 'עברית', prompt: 'מעדיפים לשחק בעברית?', accept: 'החלף', dismiss: 'לא תודה' },
  sv: { nativeName: 'Svenska', prompt: 'Vill du spela på svenska?', accept: 'Byt', dismiss: 'Nej tack' },
  ja: { nativeName: '日本語', prompt: '日本語でプレイしますか？', accept: '切り替える', dismiss: 'いいえ' },
};
