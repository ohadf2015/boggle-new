/**
 * AI lesson enrichment — pure helpers shared by
 * `POST /api/education/lesson-enrich` (prompt + parse) and the teacher's
 * WordListEditor (merge, "which words still need data").
 *
 * The merge is deliberately conservative: it only ever fills EMPTY fields so
 * a teacher's own wording is never overwritten, and it reports exactly what
 * it filled so the UI can highlight those fields for review.
 */
import { z } from 'zod';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { withBlank } from './vocabFocus';

export const MAX_ENRICH_WORDS = 60;
export const MAX_LIST_ITEMS = 4;

export type EnrichableField = 'definition' | 'synonyms' | 'antonyms' | 'example';
export const ENRICHABLE_FIELDS: readonly EnrichableField[] = ['definition', 'synonyms', 'antonyms', 'example'];

export interface WordEnrichment {
  definition?: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
}

export type EnrichmentMap = Record<string, WordEnrichment>;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  he: 'Hebrew',
  sv: 'Swedish',
  ja: 'Japanese',
  es: 'Spanish',
  ru: 'Russian',
};

export function buildEnrichPrompt(words: string[], language: string): string {
  const languageName = LANGUAGE_NAMES[language] || 'English';
  const list = words.map((w) => `"${w}"`).join(', ');
  return `You are helping a middle-school teacher build a vocabulary lesson in ${languageName}.
For EACH of these words, write material at a middle-school reading level (ages 11–14), in ${languageName}:

Words: ${list}

For every word return:
- "definition": one short, plain sentence a 12-year-old understands (max 15 words). No circular definitions.
- "synonyms": 2 to 4 common single words with the same meaning.
- "antonyms": 1 to 3 common single words with the opposite meaning (omit the key if the word has no natural opposite).
- "example": ONE natural sentence that uses the word, with the word itself replaced by ___ (three underscores). The sentence must give enough context clues to guess the word. Never include the word in the sentence.

Output ONLY valid JSON, an object keyed by the exact word as given:
{"word": {"definition": "...", "synonyms": ["..."], "antonyms": ["..."], "example": "The ___ ..."}}`;
}

const listSchema = z.union([z.array(z.unknown()), z.string()]).optional();
const entrySchema = z
  .object({
    definition: z.unknown().optional(),
    synonyms: listSchema,
    antonyms: listSchema,
    example: z.unknown().optional(),
  })
  .passthrough();

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function toList(value: unknown, word: string): string[] {
  const raw: unknown[] = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,;、，]/) : [];
  const seen = new Set<string>([word.toLowerCase()]);
  const out: string[] = [];
  for (const item of raw) {
    const s = clean(item);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

/** Lenient JSON-object extraction: tolerates code fences and prose around the object. */
export function extractJsonObject(text: string): unknown | null {
  const stripped = text.replace(/```(?:json)?/gi, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Parse the model's text into a normalised map. Only words that were requested
 * survive (keys matched case-insensitively and returned under the requested
 * spelling). Empty / invalid fields are dropped rather than passed through.
 */
export function parseEnrichResponse(text: string, requestedWords: string[]): EnrichmentMap {
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const byLower = new Map<string, unknown>();
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    byLower.set(key.trim().toLowerCase(), value);
  }

  const result: EnrichmentMap = {};
  for (const word of requestedWords) {
    const raw = byLower.get(word.trim().toLowerCase());
    if (!raw) continue;
    const entry = entrySchema.safeParse(raw);
    if (!entry.success) continue;

    const enrichment: WordEnrichment = {};
    const definition = clean(entry.data.definition);
    if (definition) enrichment.definition = definition;
    const synonyms = toList(entry.data.synonyms, word);
    if (synonyms.length) enrichment.synonyms = synonyms;
    const antonyms = toList(entry.data.antonyms, word);
    if (antonyms.length) enrichment.antonyms = antonyms;
    const example = withBlank(clean(entry.data.example), word);
    if (example) enrichment.example = example;

    result[word] = enrichment;
  }
  return result;
}

const isEmptyField = (word: VocabularyWord, field: EnrichableField): boolean => {
  if (field === 'synonyms' || field === 'antonyms') {
    const list = word[field];
    return !Array.isArray(list) || list.filter((s) => clean(s)).length === 0;
  }
  return clean(word[field]).length === 0;
};

/** Words that have at least one empty enrichable field. */
export function wordsNeedingEnrichment(words: VocabularyWord[]): string[] {
  return words
    .filter((w) => ENRICHABLE_FIELDS.some((field) => isEmptyField(w, field)))
    .map((w) => w.word);
}

export interface MergeResult {
  words: VocabularyWord[];
  /** word → fields that were filled from the enrichment (for review highlighting). */
  filled: Record<string, EnrichableField[]>;
}

/** Fill ONLY empty fields. Never overwrites teacher-entered data. */
export function mergeEnrichment(words: VocabularyWord[], enrichment: EnrichmentMap): MergeResult {
  const byLower = new Map<string, WordEnrichment>();
  for (const [key, value] of Object.entries(enrichment)) byLower.set(key.trim().toLowerCase(), value);

  const filled: Record<string, EnrichableField[]> = {};
  const merged = words.map((word) => {
    const extra = byLower.get(word.word.trim().toLowerCase());
    if (!extra) return word;
    const next: VocabularyWord = { ...word };
    const filledFields: EnrichableField[] = [];
    for (const field of ENRICHABLE_FIELDS) {
      const value = extra[field];
      if (value === undefined || !isEmptyField(word, field)) continue;
      if (field === 'synonyms' || field === 'antonyms') {
        if (!Array.isArray(value) || value.length === 0) continue;
        next[field] = [...value];
      } else {
        if (typeof value !== 'string' || !value.trim()) continue;
        next[field] = value;
      }
      filledFields.push(field);
    }
    if (filledFields.length) filled[word.word] = filledFields;
    return filledFields.length ? next : word;
  });

  return { words: merged, filled };
}
