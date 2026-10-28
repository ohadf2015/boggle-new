// Guests have no server record, so their best lives on the device; signed-in players use the server's.
const key = (difficulty: string) => `blast:best:v1:${difficulty}`;

export function readLocalBest(difficulty: string): number | null {
  try {
    const n = Number(window.localStorage.getItem(key(difficulty)));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function recordLocalBest(difficulty: string, score: number): void {
  try {
    if (score > (readLocalBest(difficulty) ?? 0)) window.localStorage.setItem(key(difficulty), String(score));
  } catch {
    /* storage blocked: the best just isn't remembered */
  }
}
