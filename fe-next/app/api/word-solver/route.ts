/**
 * API Route: /api/word-solver
 * Finds all valid words that can be formed from given letters
 * Uses the full dictionary for each language
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { normalizeHebrewWord, applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { BLANK_CHARS, MAX_BLANKS, buildMatcher, parsePattern } from './matcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_LANGUAGES = ['en', 'es', 'he', 'sv', 'ja'] as const;
type SolverLanguage = (typeof VALID_LANGUAGES)[number];

interface WordSolverRequest {
  letters: string;
  language?: string;
  pattern?: string;
  startsWith?: string;
  endsWith?: string;
  contains?: string;
  length?: number;
}

// Rate limit: 20 requests per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 20,
  windowMs: 60000,
  blockDurationMs: 300000,
};

// Module-level dictionary cache
const dictionaryCache: Record<string, Set<string>> = {};

async function getDictionary(language: SolverLanguage): Promise<Set<string>> {
  if (dictionaryCache[language]) return dictionaryCache[language];

  const { loadDictionaryWords } = await import('./dictionaryLoader');
  const words = await loadDictionaryWords(language);
  const wordSet = new Set(words);
  dictionaryCache[language] = wordSet;
  return wordSet;
}

function normalizeInput(letters: string, language: SolverLanguage): string {
  switch (language) {
    case 'he':
      return normalizeHebrewWord(letters.replace(/\s+/g, ''));
    case 'ja':
      return letters.replace(/\s+/g, '');
    case 'sv':
      return letters.toLowerCase().replace(/[^a-zåäöéàü]/gi, '').toLowerCase();
    case 'es':
      return letters.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '').toLowerCase();
    case 'en':
    default:
      return letters.toLowerCase().replace(/[^a-z]/g, '');
  }
}

function normalizeWord(word: string, language: SolverLanguage): string {
  switch (language) {
    case 'he':
      return normalizeHebrewWord(word);
    case 'ja':
      return word;
    case 'sv':
      return word.toLowerCase();
    case 'es':
      return word.toLowerCase();
    case 'en':
    default:
      return word.toLowerCase();
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'word-solver', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  // `null`, a number or an array is valid JSON but not a request object; destructuring
  // `null` would throw and surface as a 500.
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const body = parsed as Partial<WordSolverRequest>;

  const { letters: rawLetters, language: rawLang = 'en', pattern: rawPattern } = body;
  const language = (VALID_LANGUAGES.includes(rawLang as SolverLanguage) ? rawLang : 'en') as SolverLanguage;
  const letters = typeof rawLetters === 'string' ? rawLetters : '';
  const patternText = typeof rawPattern === 'string' ? rawPattern.trim() : '';

  if (letters.trim().length < 2 && patternText.length < 2) {
    return NextResponse.json({ error: 'At least 2 letters required' }, { status: 400 });
  }

  if (letters.length > 20 || patternText.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 characters' }, { status: 400 });
  }

  const blanks = (letters.match(BLANK_CHARS) || []).length;
  if (blanks > MAX_BLANKS) {
    return NextResponse.json({ error: `Maximum ${MAX_BLANKS} blank tiles` }, { status: 400 });
  }

  const pattern = patternText ? parsePattern(patternText, (ch) => normalizeInput(ch, language)) : null;
  if (patternText && !pattern) {
    return NextResponse.json({ error: 'Pattern can only contain letters and _ for unknown spots' }, { status: 400 });
  }

  const filterText = (value: unknown) =>
    typeof value === 'string' ? normalizeInput(value.slice(0, 20), language) : '';
  const lengthFilter =
    typeof body.length === 'number' && Number.isInteger(body.length) && body.length >= 2 && body.length <= 20
      ? body.length
      : null;

  try {
    const dictionary = await getDictionary(language);
    const normalizedInput = normalizeInput(letters.replace(BLANK_CHARS, ''), language);
    if (!pattern && normalizedInput.length + blanks < 2) {
      return NextResponse.json({ words: [], total: 0 });
    }

    const matches = buildMatcher({
      rack: normalizedInput,
      blanks,
      pattern,
      startsWith: filterText(body.startsWith),
      endsWith: filterText(body.endsWith),
      contains: filterText(body.contains),
      length: lengthFilter,
    });
    // Set: the Hebrew dictionary stores sofit-folded forms, so restoring the
    // final letter can collapse two entries into one display word.
    const found = new Set<string>();

    for (const word of dictionary) {
      if (matches(normalizeWord(word, language))) {
        // he: dictionary words end in the regular form (שלומ); show the real
        // spelling with a final letter (שלום).
        found.add(language === 'he' ? applyHebrewFinalLetters(word) : word);
      }
    }
    const results = Array.from(found);

    // Sort by length descending, then alphabetically
    results.sort((a, b) => b.length - a.length || a.localeCompare(b));

    // Cap at 500 results to prevent huge responses
    const capped = results.slice(0, 500);

    return NextResponse.json({
      words: capped,
      total: results.length,
      capped: results.length > 500,
    });
  } catch (error) {
    console.error('[word-solver] Error:', error);
    return NextResponse.json({ error: 'Failed to solve' }, { status: 500 });
  }
}
