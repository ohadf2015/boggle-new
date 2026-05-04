export interface LadderWord {
  word: string;
  score: number;
  ts: number;
  userId: string;
  stolenFrom?: string;
  inputMethod?: 'kb' | 'drag';
}

/** Placeholder — real implementation in Task P2.T8. */
export function WordsLadder({ words }: { words: LadderWord[]; meId?: string }) {
  return (
    <ul className="flex flex-col gap-1 p-2" data-component="words-ladder">
      {words.map((w, i) => (
        <li key={`${w.word}-${w.ts}-${i}`} className="flex justify-between text-sm">
          <span className="font-mono">{w.word}</span><span className="opacity-60">{w.score}</span>
        </li>
      ))}
    </ul>
  );
}
