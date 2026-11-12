export interface PersonalBestState {
  lastScore: number;
  firedThisRound: boolean;
}

export function createPersonalBestState(): PersonalBestState {
  return { lastScore: 0, firedThisRound: false };
}

export function nextPersonalBestState(
  state: PersonalBestState,
  score: number,
  best: number | null,
): { state: PersonalBestState; fire: boolean } {
  const fired = score < state.lastScore ? false : state.firedThisRound;
  const fire = !fired && best !== null && best > 0 && score > best;
  return { state: { lastScore: score, firedThisRound: fired || fire }, fire };
}
