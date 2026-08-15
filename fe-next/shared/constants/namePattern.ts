/**
 * Single source of truth for valid username / room-name characters.
 *
 * The client (utils/consts.ts) and the server (shared/schemas/socketSchemas.ts)
 * used to carry two different patterns: the client allowed any Unicode letter,
 * the server enumerated script ranges by hand. Every name in a script nobody had
 * hit yet (Greek, Korean, Vietnamese, Thai, Arabic...) passed the client and was
 * rejected by the socket handler, which is why this allowlist had already been
 * patched five times from Sentry reports. Both sides now import this.
 *
 * Any letter or number from any script, plus space, dot, underscore, hyphen.
 * \p{M} (combining marks) is required, not optional: Devanagari/Thai/Arabic
 * spell ordinary names with marks, and iOS hands back decomposed (NFD) Latin, so
 * "André" can arrive as "e" + U+0301 and would fail a letters-only class.
 * Dangerous characters (control, zero-width, BOM, bidi overrides) are rejected
 * separately by NAME_UNSAFE_PATTERN — \p{L} does not cover them.
 */
export const NAME_VALID_PATTERN = /^[\p{L}\p{M}\p{N}\s._-]+$/u;

/** Control chars, zero-width joiners/spaces, BOM, and bidi overrides (display spoofing). */
export const NAME_UNSAFE_PATTERN = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;
