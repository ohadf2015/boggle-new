/**
 * Definitions on the homework link.
 *
 * `missGapQuiz` has always been able to build the best round kind — four
 * definitions, tap the one that matches the word — but it needs a word→meaning
 * map, and the share link only ever carried `missed=word,word,word`. So in
 * practice every homework session was spelling-only: the student never had to
 * know what the word MEANT.
 *
 * This is the wire format that closes that gap. It has to survive being pasted
 * into WhatsApp and Google Classroom, so it is deliberately plain:
 *
 *   defs=anchor|a heavy hook~quiver|to shake a little
 *
 * `|` splits a pair, `~` splits pairs. Both are stripped out of the definition
 * text before encoding, so a teacher's own punctuation can never split a pair.
 * Keys are lower-cased because `buildMissGapRounds` looks them up lower-cased.
 */

/** How many definitions one link may carry — keeps a shared URL tappable. */
export const MAX_MISS_GAP_DEFINITIONS = 12;

/** Longest definition kept. A homework hint is a line, not a paragraph. */
export const MAX_MISS_GAP_DEFINITION_LENGTH = 120;

const PAIR_SEPARATOR = '~';
const FIELD_SEPARATOR = '|';
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** Collapse whitespace, drop control characters and both separators. */
function clean(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .split(PAIR_SEPARATOR)
    .join(' ')
    .split(FIELD_SEPARATOR)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Read a `defs=` value into the map `buildMissGapRounds` wants.
 * Anything malformed is skipped rather than thrown: a mangled share link must
 * still open a playable (spelling-only) homework session.
 */
export function parseMissGapDefinitions(
  raw: string | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;

  for (const pair of String(raw).split(PAIR_SEPARATOR)) {
    if (Object.keys(out).length >= MAX_MISS_GAP_DEFINITIONS) break;
    const cut = pair.indexOf(FIELD_SEPARATOR);
    if (cut < 0) continue;
    const word = clean(pair.slice(0, cut), 40).toLowerCase();
    const definition = clean(pair.slice(cut + 1), MAX_MISS_GAP_DEFINITION_LENGTH);
    if (!word || !definition) continue;
    out[word] = definition;
  }
  return out;
}

/**
 * Write the `defs=` value. Pass `words` to keep only the definitions that
 * belong to this assignment — a lesson can hold fifty, the link carries the
 * handful the class actually missed.
 */
export function encodeMissGapDefinitions(
  definitions: Record<string, string> | null | undefined,
  words?: string[],
): string {
  if (!definitions) return '';
  const allowed = words?.length
    ? new Set(words.map((w) => String(w || '').trim().toLowerCase()))
    : null;

  const pairs: string[] = [];
  for (const [rawWord, rawDefinition] of Object.entries(definitions)) {
    if (pairs.length >= MAX_MISS_GAP_DEFINITIONS) break;
    const word = clean(rawWord, 40).toLowerCase();
    const definition = clean(rawDefinition, MAX_MISS_GAP_DEFINITION_LENGTH);
    if (!word || !definition) continue;
    if (allowed && !allowed.has(word)) continue;
    pairs.push(`${word}${FIELD_SEPARATOR}${definition}`);
  }
  return pairs.join(PAIR_SEPARATOR);
}

/** True when there are enough definitions for a 4-choice meaning round. */
export function canBuildMeaningRounds(
  definitions: Record<string, string> | null | undefined,
): boolean {
  if (!definitions) return false;
  return new Set(Object.values(definitions).filter(Boolean)).size >= 4;
}
