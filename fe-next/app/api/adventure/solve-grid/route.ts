/**
 * API Route: /api/adventure/solve-grid
 * Pre-solves a grid and returns all valid words for client-side validation.
 * This eliminates per-word HTTP round-trips during gameplay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Module-level dictionary cache (persists across requests in the same serverless instance)
const dictionaryCache: Record<string, { words: Set<string>; prefixes: Set<string> }> = {};

async function getDictionary(language: string): Promise<{ words: Set<string>; prefixes: Set<string> }> {
  if (dictionaryCache[language]) return dictionaryCache[language];

  const { loadDictionaryWords } = await import('@/app/api/word-solver/dictionaryLoader');
  const words = await loadDictionaryWords(language);
  const wordSet = new Set(words);

  // Build prefix set for DFS pruning — critical for 5x5+ grids
  const prefixSet = new Set<string>();
  for (const w of words) {
    for (let i = 1; i <= w.length; i++) {
      prefixSet.add(w.slice(0, i));
    }
  }

  dictionaryCache[language] = { words: wordSet, prefixes: prefixSet };
  return dictionaryCache[language];
}

/**
 * Find all valid words on a grid using DFS + dictionary lookup.
 * Returns lowercase words.
 */
function findWordsOnGrid(
  grid: string[][],
  dictionary: Set<string>,
  prefixes: Set<string>,
  minLength: number
): string[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return [];

  const found = new Set<string>();
  const visited = new Set<string>();

  function dfs(row: number, col: number, current: string) {
    const key = `${row},${col}`;
    if (visited.has(key)) return;

    visited.add(key);
    const letter = grid[row][col].toLowerCase();
    const word = current + letter;

    // Prefix pruning — skip entire subtree if no dictionary word starts with this prefix
    if (!prefixes.has(word)) {
      visited.delete(key);
      return;
    }

    if (word.length >= minLength && dictionary.has(word)) {
      found.add(word);
    }

    // Don't go deeper than 12 letters
    if (word.length < 12) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            dfs(nr, nc, word);
          }
        }
      }
    }

    visited.delete(key);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dfs(r, c, '');
    }
  }

  return Array.from(found);
}

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'adventure-solve-grid', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter ?? 60) } }
    );
  }

  // Authenticate — prevents dictionary brute-forcing
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { grid } = body;
    const language = typeof body.language === 'string' ? body.language : 'en';
    const minLength = typeof body.minLength === 'number' ? body.minLength : 2;

    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
      return NextResponse.json({ error: 'Invalid grid' }, { status: 400 });
    }

    // Validate grid dimensions (max 7x7)
    if (grid.length > 7 || grid[0].length > 7) {
      return NextResponse.json({ error: 'Grid too large' }, { status: 400 });
    }

    // Validate each cell is a single letter
    for (const row of grid) {
      if (!Array.isArray(row)) {
        return NextResponse.json({ error: 'Invalid grid row' }, { status: 400 });
      }
      for (const cell of row) {
        if (typeof cell !== 'string' || Array.from(cell).length !== 1 || !/^\p{L}$/u.test(cell)) {
          return NextResponse.json({ error: 'Invalid grid cell — must be a single letter' }, { status: 400 });
        }
      }
    }

    const { words: dictionary, prefixes } = await getDictionary(language);
    const validWords = findWordsOnGrid(grid, dictionary, prefixes, minLength);

    return NextResponse.json({
      words: validWords,
      count: validWords.length,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
