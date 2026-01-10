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

    // Generate grid with the target word embedded
    // We pass [targetWord] as the embedded words list
    const grid = generateRandomTable(
      rows, 
      cols, 
      language as Language, 
      [targetWord]
    );

    return NextResponse.json({ grid });
  } catch (error) {
    console.error('Grid generation error:', error);
    return NextResponse.json({ error: 'Failed to generate grid' }, { status: 500 });
  }
}
