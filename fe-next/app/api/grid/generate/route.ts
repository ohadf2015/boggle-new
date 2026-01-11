import { NextResponse } from 'next/server';
import { generateRandomTable } from '@/backend/utils/gameUtils';
import type { Language } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetWord, language, gridSize } = body;

    // Basic validation
    if (!targetWord || typeof targetWord !== 'string') {
      return NextResponse.json({ error: 'Invalid target word' }, { status: 400 });
    }

    if (!language || typeof language !== 'string') {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    const rows = gridSize?.rows || 4;
    const cols = gridSize?.cols || 4;

    // Validate grid size
    if (rows < 3 || rows > 10 || cols < 3 || cols > 10) {
      return NextResponse.json({ error: 'Grid size must be between 3x3 and 10x10' }, { status: 400 });
    }

    // Validate target word can fit in grid
    if (targetWord.length > rows * cols) {
      return NextResponse.json({
        error: `Target word "${targetWord}" (${targetWord.length} letters) too long for ${rows}x${cols} grid (${rows * cols} cells)`
      }, { status: 400 });
    }

    // Generate grid with the target word embedded
    // We pass [targetWord] as the embedded words list
    const grid = generateRandomTable(
      rows,
      cols,
      language as Language,
      [targetWord]
    );

    if (!grid || !Array.isArray(grid) || grid.length === 0) {
      throw new Error('generateRandomTable returned invalid grid');
    }

    return NextResponse.json({ grid });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Grid generation error:', errorMessage, { targetWord: (error as any)?.targetWord, language: (error as any)?.language });
    return NextResponse.json({
      error: 'Failed to generate grid',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
