/** The word deck a student studies in the live lobby before the match. */
export interface StudyCard {
  word: string;
  definition?: string;
  hint?: string;
}

export const MAX_STUDY_CARDS = 40;
const MAX_TEXT = 240;

function clip(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text.slice(0, MAX_TEXT) : undefined;
}

function card(word: string, extra?: { definition?: unknown; hint?: unknown }): StudyCard {
  const out: StudyCard = { word: word.slice(0, MAX_TEXT) };
  const definition = clip(extra?.definition);
  const hint = clip(extra?.hint);
  if (definition) out.definition = definition;
  if (hint) out.hint = hint;
  return out;
}

/** `lessonWordLists` = raw `vocabulary_lessons.words` columns: plain strings or `{ word, definition, hint }`. */
export function buildStudyCards(gameWords: readonly string[], lessonWordLists: readonly unknown[]): StudyCard[] {
  const details = new Map<string, { word: string; definition?: unknown; hint?: unknown }>();
  for (const list of lessonWordLists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const raw = typeof entry === 'string' ? { word: entry } : (entry as { word?: unknown } | null);
      if (!raw || typeof raw.word !== 'string' || !raw.word.trim()) continue;
      const key = raw.word.trim().toLowerCase();
      if (!details.has(key)) details.set(key, { ...(raw as object), word: raw.word.trim() });
    }
  }

  const source = gameWords.some((w) => w.trim()) ? gameWords : [...details.values()].map((d) => d.word);
  const seen = new Set<string>();
  const cards: StudyCard[] = [];
  for (const raw of source) {
    const word = raw.trim();
    const key = word.toLowerCase();
    if (!word || seen.has(key)) continue;
    seen.add(key);
    cards.push(card(word, details.get(key)));
    if (cards.length === MAX_STUDY_CARDS) break;
  }
  return cards;
}

export function parseStudyCards(value: unknown): StudyCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const word = clip((entry as { word?: unknown } | null)?.word);
    return word ? [card(word, entry as { definition?: unknown; hint?: unknown })] : [];
  }).slice(0, MAX_STUDY_CARDS);
}
