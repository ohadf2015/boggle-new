/** A round with no points has no winner: every celebration (confetti, win sting, "you won") keys off this. */
type Scored = { score?: number | null; totalScore?: number | null };

export function roundHasScore(scores: ReadonlyArray<Scored> | null | undefined): boolean {
  return !!scores?.some((s) => (s.score ?? s.totalScore ?? 0) > 0);
}
