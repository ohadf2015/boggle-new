export interface StepResult {
  wild: boolean;
  /** number of wrong guesses before solving this step */
  attempts: number;
}

export function stepEmoji(s: StepResult): string {
  if (s.wild) return '🔮';
  if (s.attempts === 0) return '✨';
  if (s.attempts <= 3) return '🟨';
  return '🟥';
}

export function deriveScore(steps: StepResult[]): number {
  return steps.reduce((sum, s) => {
    if (s.wild) return sum + 60;
    if (s.attempts === 0) return sum + 100;
    if (s.attempts <= 3) return sum + 50;
    return sum + 20;
  }, 0);
}

export function buildAlchemyShareText(steps: StepResult[], puzzleNumber: number): string {
  const row = steps.map(stepEmoji).join('');
  const score = deriveScore(steps);
  return `Word Alchemy 🧪\n${row} — ${score}pts\nPuzzle ${puzzleNumber} · lexiclash.com/en/word-alchemy/`;
}
