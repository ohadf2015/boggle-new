/**
 * API Route: /api/word-solver
 * Finds all valid words that can be formed from given letters
 * Uses the full dictionary for each language
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_LANGUAGES = ['en', 'es', 'he', 'sv', 'ja'] as const;
type SolverLanguage = (typeof VALID_LANGUAGES)[number];

interface WordSolverRequest {
  letters: string;
  language?: string;
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

function getLetterCounts(str: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of str) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

function canFormWord(word: string, available: Record<string, number>): boolean {
  const needed = getLetterCounts(word);
  for (const [letter, count] of Object.entries(needed)) {
    if ((available[letter] || 0) < count) return false;
  }
  return true;
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

  let body: WordSolverRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { letters, language: rawLang = 'en' } = body;
  const language = (VALID_LANGUAGES.includes(rawLang as SolverLanguage) ? rawLang : 'en') as SolverLanguage;

  if (!letters || typeof letters !== 'string' || letters.trim().length < 2) {
    return NextResponse.json({ error: 'At least 2 letters required' }, { status: 400 });
  }

  if (letters.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 characters' }, { status: 400 });
  }

  try {
    const dictionary = await getDictionary(language);
    const normalizedInput = normalizeInput(letters, language);
    if (normalizedInput.length < 2) {
      return NextResponse.json({ words: [], total: 0 });
    }

    const inputCounts = getLetterCounts(normalizedInput);
    const results: string[] = [];

    for (const word of dictionary) {
      if (word.length < 2 || word.length > normalizedInput.length) continue;
      const normalized = normalizeWord(word, language);
      if (canFormWord(normalized, inputCounts)) {
        results.push(word);
      }
    }

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
