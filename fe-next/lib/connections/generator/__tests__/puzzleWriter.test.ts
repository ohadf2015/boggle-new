import { describe, it, expect } from 'vitest';
import { renderPuzzleFile } from '../puzzleWriter';

describe('renderPuzzleFile', () => {
  it('renders a const export with matching variable name and type', () => {
    const out = renderPuzzleFile({
      exportName: 'HE_HARD',
      difficulty: 'hard',
      idPrefix: 'he-h',
      startId: 200,
      triples: [
        { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
      ],
    });
    expect(out).toContain("import type { ConnectionPuzzle } from '../../types';");
    expect(out).toContain('export const HE_HARD: ConnectionPuzzle[]');
    expect(out).toContain("id: 'he-h-200'");
    expect(out).toContain("word1: 'בית'");
    expect(out).toContain("bridge: 'ספר'");
    expect(out).toContain("word2: 'תורה'");
    expect(out).toContain("difficulty: 'hard'");
  });

  it('assigns sequential padded ids across multiple triples', () => {
    const out = renderPuzzleFile({
      exportName: 'HE_HARD',
      difficulty: 'hard',
      idPrefix: 'he-h',
      startId: 200,
      triples: [
        { word1: 'א', bridge: 'ב', word2: 'ג' },
        { word1: 'ד', bridge: 'ה', word2: 'ו' },
        { word1: 'ז', bridge: 'ח', word2: 'ט' },
      ],
    });
    expect(out).toContain("id: 'he-h-200'");
    expect(out).toContain("id: 'he-h-201'");
    expect(out).toContain("id: 'he-h-202'");
  });

  it('escapes single quotes inside words', () => {
    const out = renderPuzzleFile({
      exportName: 'EN_HARD',
      difficulty: 'hard',
      idPrefix: 'en-h',
      startId: 1,
      triples: [{ word1: "it's", bridge: 'a', word2: 'b' }],
    });
    expect(out).toContain("word1: 'it\\'s'");
  });
});
