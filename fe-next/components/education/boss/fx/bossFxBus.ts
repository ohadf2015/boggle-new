/** The moment a word reaches the boss: the art flinches on this, whichever FX path (Pixi or DOM) delivered it. */
export interface BossImpact {
  crit: boolean;
}

const subs = new Set<(i: BossImpact) => void>();

export const bossImpactBus = {
  emit(i: BossImpact): void {
    subs.forEach((f) => f(i));
  },
  on(f: (i: BossImpact) => void): () => void {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
};
