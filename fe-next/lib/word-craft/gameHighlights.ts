interface Move {
  who: 'player' | 'bot';
  words: string[];
  score: number;
}

export interface GameHighlights {
  bestMove: { word: string; score: number } | null;
  longestWord: string | null;
  moves: number;
}

export function summarizeGame(history: readonly Move[]): GameHighlights {
  let bestMove: GameHighlights['bestMove'] = null;
  let longestWord: string | null = null;
  let moves = 0;
  for (const m of history) {
    if (m.who !== 'player' || m.words.length === 0) continue;
    moves++;
    const main = m.words.reduce((a, b) => (b.length > a.length ? b : a));
    if (!bestMove || m.score > bestMove.score) bestMove = { word: main, score: m.score };
    if (!longestWord || main.length > longestWord.length) longestWord = main;
  }
  return { bestMove, longestWord, moves };
}
