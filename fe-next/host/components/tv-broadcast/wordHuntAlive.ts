/**
 * Hunters still in for the projector. Lives arrive with the first life update;
 * until then every seated player is alive (the header read "0 alive" at GO).
 */
export function wordHuntAlive(lives: Record<string, number>, eliminated: readonly string[], seated: number) {
  const known = Object.keys(lives).length;
  if (known === 0) return { alive: seated, total: seated };
  return { alive: Math.max(0, known - eliminated.length), total: known };
}
