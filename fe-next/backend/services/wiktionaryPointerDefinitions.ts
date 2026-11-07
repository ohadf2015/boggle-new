export interface WiktionaryEntry {
  partOfSpeech?: string;
  language?: string;
  definitions?: { definition?: string }[];
}

// A sense that only redirects to a spelling slip or a shortening is not a word players should score.
const POINTER_SENSE = /^(deliberate |common |rare |obsolete |nonstandard )*(misspelling|abbreviation|initialism|acronym|clipping|ellipsis|contraction|eye dialect spelling|pronunciation spelling|leetspeak|text messaging|internet slang)( form)? (of|for)\b/i;

const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Entries with at least one real sense; entries without definition text are kept as-is. */
export function withRealSenses<T extends WiktionaryEntry>(entries: T[]): { kept: T[]; pointerOnly: boolean } {
  const kept = entries.filter((e) => {
    const defs = (e.definitions ?? []).map((d) => plain(d.definition ?? '')).filter(Boolean);
    return defs.length === 0 || defs.some((d) => !POINTER_SENSE.test(d));
  });
  return { kept, pointerOnly: entries.length > 0 && kept.length === 0 };
}
