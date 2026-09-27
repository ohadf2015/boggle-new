import type { Difficulty } from '../types';

export interface PuzzleTriple {
  word1: string;
  bridge: string;
  word2: string;
}

export interface RenderPuzzleFileOptions {
  exportName: string;
  difficulty: Difficulty;
  idPrefix: string;
  startId: number;
  triples: PuzzleTriple[];
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "\\'");
}

function q(value: string): string {
  return `'${escapeSingleQuotes(value)}'`;
}

export function renderPuzzleFile(opts: RenderPuzzleFileOptions): string {
  const { exportName, difficulty, idPrefix, startId, triples } = opts;

  const entries = triples.map((triple, i) => {
    const id = `${idPrefix}-${startId + i}`;
    return [
      '  {',
      `    id: ${q(id)},`,
      `    word1: ${q(triple.word1)},`,
      `    bridge: ${q(triple.bridge)},`,
      `    word2: ${q(triple.word2)},`,
      `    difficulty: ${q(difficulty)},`,
      '  },',
    ].join('\n');
  });

  return [
    "import type { ConnectionPuzzle } from '../../types';",
    '',
    `export const ${exportName}: ConnectionPuzzle[] = [`,
    ...entries,
    '];',
    '',
  ].join('\n');
}
