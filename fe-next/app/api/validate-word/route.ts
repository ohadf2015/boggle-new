/**
 * API Route: /api/validate-word
 * Validates words for single-player mode
 * Supports English, Spanish, Hebrew, Swedish, and Japanese dictionaries
 * Also checks community-validated words (words with 6+ net votes)
 */

import { NextRequest } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { createClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization';
import * as fs from 'fs';
import * as path from 'path';

// Lazy-loaded dictionaries for all languages (populated on first request)
let englishDictionary: Set<string> | null = null;
let spanishDictionary: Set<string> | null = null;
let hebrewDictionary: Set<string> | null = null;
let swedishDictionary: Set<string> | null = null;
let japaneseDictionary: Set<string> | null = null;

async function loadEnglishDictionary(): Promise<Set<string>> {
  if (englishDictionary) return englishDictionary;
  const englishWords = (await import('an-array-of-english-words', { with: { type: 'json' } })).default as string[];
  englishDictionary = new Set(englishWords.map((w) => w.toLowerCase()));
  return englishDictionary;
}

async function loadSpanishDictionary(): Promise<Set<string>> {
  if (spanishDictionary) return spanishDictionary;
  const spanishWords = (await import('an-array-of-spanish-words', { with: { type: 'json' } })).default as string[];
  spanishDictionary = new Set(spanishWords.map((w) => w.toLowerCase()));
  return spanishDictionary;
}

function loadHebrewDictionary(): Set<string> {
  if (hebrewDictionary) return hebrewDictionary;

  hebrewDictionary = new Set<string>();
  const backendDir = path.join(process.cwd(), 'backend');

  // Load main dictionary
  const mainFile = path.join(backendDir, 'hebrew_words.txt');
  if (fs.existsSync(mainFile)) {
    const content = fs.readFileSync(mainFile, 'utf-8');
    content.split('\n')
      .map(w => normalizeHebrewWord(w.trim()))
      .filter(w => w.length > 0)
      .forEach(w => hebrewDictionary!.add(w));
  }

  // Load approved words
  const approvedFile = path.join(backendDir, 'hebrew_words_approved.txt');
  if (fs.existsSync(approvedFile)) {
    const content = fs.readFileSync(approvedFile, 'utf-8');
    content.split('\n')
      .map(w => normalizeHebrewWord(w.trim()))
      .filter(w => w.length > 0)
      .forEach(w => hebrewDictionary!.add(w));
  }

  return hebrewDictionary;
}

function loadSwedishDictionary(): Set<string> {
  if (swedishDictionary) return swedishDictionary;

  swedishDictionary = new Set<string>();

  // Load from npm package
  const swedishWordsPath = path.join(process.cwd(), 'node_modules/@arvidbt/swedish-words/out/index.js');
  if (fs.existsSync(swedishWordsPath)) {
    const content = fs.readFileSync(swedishWordsPath, 'utf-8');
    const arrayMatch = content.match(/var swedish_words = \[([\s\S]*?)\];/);

    if (arrayMatch) {
      const arrayContent = arrayMatch[1];
      const validSwedishWordPattern = /^[a-zåäöéàü]+$/i;

      arrayContent.split(',').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          try {
            // Decode escape sequences
            const jsonCompatible = trimmed.replace(/\\x([0-9A-Fa-f]{2})/g, '\\u00$1');
            const word = JSON.parse(jsonCompatible);
            if (word && word.length > 1 && validSwedishWordPattern.test(word)) {
              swedishDictionary!.add(word.toLowerCase());
            }
          } catch {
            // Skip invalid entries
          }
        }
      });
    }
  }

  // Load approved words
  const approvedFile = path.join(process.cwd(), 'backend', 'swedish_words_approved.txt');
  if (fs.existsSync(approvedFile)) {
    const content = fs.readFileSync(approvedFile, 'utf-8');
    content.split('\n')
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0)
      .forEach(w => swedishDictionary!.add(w));
  }

  return swedishDictionary;
}

function loadJapaneseDictionary(): Set<string> {
  if (japaneseDictionary) return japaneseDictionary;

  japaneseDictionary = new Set<string>();
  const backendDir = path.join(process.cwd(), 'backend');

  // Load kanji compounds
  const kanjiFile = path.join(backendDir, 'kanji_compounds.txt');
  if (fs.existsSync(kanjiFile)) {
    const content = fs.readFileSync(kanjiFile, 'utf-8');
    content.split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0)
      .forEach(w => japaneseDictionary!.add(w));
  }

  // Load approved words
  const approvedFile = path.join(backendDir, 'japanese_words_approved.txt');
  if (fs.existsSync(approvedFile)) {
    const content = fs.readFileSync(approvedFile, 'utf-8');
    content.split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0)
      .forEach(w => japaneseDictionary!.add(w));
  }

  return japaneseDictionary;
}

// Supabase client for checking community words
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/**
 * Check if a word is community-validated (net_score >= 6)
 */
async function checkCommunityWord(word: string, language: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('word_scores')
      .select('id')
      .eq('word', word)
      .eq('language', language)
      .eq('is_potentially_valid', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[validate-word] Community word check error:', error.message);
      return false;
    }

    return data !== null;
  } catch {
    return false;
  }
}

function normalizeWord(word: string, language: string): string {
  switch (language) {
    case 'es':
      return normalizeSpanishWord(word);
    case 'he':
      return normalizeHebrewWord(word);
    case 'ja':
      return word;
    case 'sv':
    case 'en':
    default:
      return word.toLowerCase();
  }
}

// Rate limit config: 600 requests per minute per IP
// Higher limit for gameplay — Blast mode submits words rapidly during cascades
// Also accommodates multiple users on same network (family, office, cafe)
const RATE_LIMIT_CONFIG = {
  maxRequests: 600,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

// Using Node.js runtime for dictionary caching efficiency
// Edge runtime would reload 11MB+ dictionary on every cold start
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'validate-word', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { word, language = 'en' } = body;

    // Basic validation
    if (!word || typeof word !== 'string') {
      return Response.json({
        isValid: false,
        reason: 'Invalid word format',
        source: 'format',
      }, { status: 400 });
    }

    const normalizedWord = normalizeWord(word.trim(), language);

    if (normalizedWord.length < 2) {
      return Response.json({
        isValid: false,
        reason: 'Word must be at least 2 letters',
        source: 'format',
      });
    }

    // Check dictionary based on language
    let isInDictionary = false;
    switch (language) {
      case 'en':
        isInDictionary = (await loadEnglishDictionary()).has(normalizedWord);
        break;
      case 'es':
        isInDictionary = (await loadSpanishDictionary()).has(normalizedWord);
        break;
      case 'he':
        isInDictionary = loadHebrewDictionary().has(normalizedWord);
        break;
      case 'sv':
        isInDictionary = loadSwedishDictionary().has(normalizedWord);
        break;
      case 'ja':
        isInDictionary = loadJapaneseDictionary().has(normalizedWord);
        break;
    }

    if (isInDictionary) {
      return Response.json({
        isValid: true,
        source: 'dictionary',
      });
    }

    // Check community-validated words (words with 6+ net votes)
    // Returns same response as dictionary words - players shouldn't know the difference
    const isCommunityValid = await checkCommunityWord(normalizedWord, language);
    if (isCommunityValid) {
      return Response.json({
        isValid: true,
        source: 'dictionary',
      });
    }

    // Word not in dictionary or community - return pending
    return Response.json({
      isValid: false,
      reason: 'Word not in dictionary',
      source: 'pending',
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[validate-word] Error:', msg);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/validate-word',
      { method: 'POST', statusCode: 500 }
    );
    return Response.json({
      isValid: false,
      reason: 'Validation error',
      source: 'format',
    }, { status: 500 });
  }
}
