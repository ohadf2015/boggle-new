/**
 * API Route: /api/adventure/solve-grid
 * Pre-solves a grid and returns all valid words for client-side validation.
 * This eliminates per-word HTTP round-trips during gameplay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Module-level dictionary cache (persists across requests in the same serverless instance)
const dictionaryCache: Record<string, Set<string>> = {};

async function getDictionary(language: string): Promise<Set<string>> {
  if (dictionaryCache[language]) return dictionaryCache[language];

  const { loadDictionaryWords } = await import('@/app/api/word-solver/dictionaryLoader');
  const words = await loadDictionaryWords(language);
  const wordSet = new Set(words);
  dictionaryCache[language] = wordSet;
  return wordSet;
}

/**
 * Find all valid words on a grid using DFS + dictionary lookup.
 * Returns lowercase words.
 */
function findWordsOnGrid(
  grid: string[][],
  dictionary: Set<string>,
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

    if (word.length >= minLength && dictionary.has(word)) {
      found.add(word);
    }

    // Prune: don't go deeper than 12 letters (no valid words that long on typical grids)
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

  try {
    const body = await request.json();
    const { grid, language = 'en', minLength = 2 } = body;

    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
      return NextResponse.json({ error: 'Invalid grid' }, { status: 400 });
    }

    // Validate grid dimensions (max 7x7)
    if (grid.length > 7 || grid[0].length > 7) {
      return NextResponse.json({ error: 'Grid too large' }, { status: 400 });
    }

    const dictionary = await getDictionary(language);
    const validWords = findWordsOnGrid(grid, dictionary, minLength);

    return NextResponse.json({
      words: validWords,
      count: validWords.length,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
