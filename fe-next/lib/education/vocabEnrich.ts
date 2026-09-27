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
import type { VocabularyWord, WordMorphology } from '@/lib/supabase/education/types';
import { withBlank } from './vocabFocus';
import { stripHyphens } from './vocabFocusSkills';

export const MAX_ENRICH_WORDS = 60;
export const MAX_LIST_ITEMS = 4;
/** Senses kept per word. Two is what the multiple-meaning drill needs. */
export const MAX_MEANINGS = 3;

export type EnrichableField =
  | 'definition'
  | 'synonyms'
  | 'antonyms'
  | 'example'
  | 'meanings'
  | 'morphology';
export const ENRICHABLE_FIELDS: readonly EnrichableField[] = [
  'definition',
  'synonyms',
  'antonyms',
  'example',
  'meanings',
  'morphology',
];

export interface WordEnrichment {
  definition?: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
  /** Two or more distinct senses — omitted for a word that only has one. */
  meanings?: string[];
  /** Word parts — omitted for a word with no analysable root or affix. */
  morphology?: WordMorphology;
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
- "meanings": ONLY if the word genuinely carries two or more DIFFERENT senses (like "bank" or "trunk"), 2 to 3 short plain-language senses. Omit the key entirely for a single-sense word — do not pad it with rewordings of the same meaning.
- "morphology": ONLY if the word has a real, teachable word part. An object with any of "prefix", "root", "suffix" (no hyphens, e.g. "un", "aqua", "ful") and "rootMeaning" (what the root means, in one or two words). Omit the key entirely for a word with no analysable parts.

Output ONLY valid JSON, an object keyed by the exact word as given:
{"word": {"definition": "...", "synonyms": ["..."], "antonyms": ["..."], "example": "The ___ ...", "meanings": ["...", "..."], "morphology": {"prefix": "un", "root": "aqua", "rootMeaning": "water", "suffix": "ful"}}}`;
}

const listSchema = z.union([z.array(z.unknown()), z.string()]).optional();
const entrySchema = z
  .object({
    definition: z.unknown().optional(),
    synonyms: listSchema,
    antonyms: listSchema,
    example: z.unknown().optional(),
    meanings: listSchema,
    morphology: z.unknown().optional(),
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

/**
 * Senses, not a comma list: a sense is a phrase and routinely contains commas.
 * Fewer than two distinct senses is not a multiple-meaning word, so drop it.
 */
function toSenses(value: unknown): string[] {
  const raw: unknown[] = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[;；]/) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const s = clean(item);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_MEANINGS) break;
  }
  return out.length >= 2 ? out : [];
}

const MORPHEME_KEYS: readonly (keyof WordMorphology)[] = ['prefix', 'root', 'suffix', 'rootMeaning'];

/** Normalise a morphology object; returns null when nothing teachable came back. */
function toMorphology(value: unknown): WordMorphology | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const out: WordMorphology = {};
  for (const key of MORPHEME_KEYS) {
    const raw = clean(source[key]);
    const normalised = key === 'rootMeaning' ? raw : stripHyphens(raw);
    if (normalised) out[key] = normalised;
  }
  if (out.rootMeaning && !out.root) delete out.rootMeaning;
  return out.prefix || out.root || out.suffix ? out : null;
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
    const meanings = toSenses(entry.data.meanings);
    if (meanings.length) enrichment.meanings = meanings;
    const morphology = toMorphology(entry.data.morphology);
    if (morphology) enrichment.morphology = morphology;

    result[word] = enrichment;
  }
  return result;
}

const isEmptyField = (word: VocabularyWord, field: EnrichableField): boolean => {
  if (field === 'synonyms' || field === 'antonyms' || field === 'meanings') {
    const list = word[field];
    return !Array.isArray(list) || list.filter((s) => clean(s)).length === 0;
  }
  if (field === 'morphology') {
    // An object field: empty means "no part the teacher filled in", not "absent".
    return toMorphology(word.morphology) === null;
  }
  return clean(word[field]).length === 0;
};

/**
 * Fields every word should end up with. `meanings` and `morphology` are
 * deliberately NOT here: most words carry one sense and no teachable root, so
 * counting them would mark every lesson permanently incomplete and keep the
 * "fill with AI" button nagging forever. They are filled opportunistically
 * whenever enrichment runs for another reason.
 */
export const CORE_ENRICHABLE_FIELDS: readonly EnrichableField[] = [
  'definition',
  'synonyms',
  'antonyms',
  'example',
];

/** Words that have at least one empty core field. */
export function wordsNeedingEnrichment(words: VocabularyWord[]): string[] {
  return words
    .filter((w) => CORE_ENRICHABLE_FIELDS.some((field) => isEmptyField(w, field)))
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
      if (field === 'morphology') {
        const morphology = toMorphology(value);
        if (!morphology) continue;
        next.morphology = morphology;
      } else if (field === 'synonyms' || field === 'antonyms' || field === 'meanings') {
        if (!Array.isArray(value) || value.length === 0) continue;
        next[field] = [...(value as string[])];
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
