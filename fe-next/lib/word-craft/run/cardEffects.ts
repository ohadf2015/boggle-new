import type { PowerCard, ScoreContext } from './powerCards';

export interface WordScore {
  chips: number;
  mult: number;
  total: number;
}

export function applyCardEffects(
  ctx: ScoreContext,
  activeCards: readonly PowerCard[],
): WordScore {
  let chips = ctx.baseChips;
  let addMult = 0;
  let mulMult = 1;
  for (const card of activeCards) {
    if (!card.scoreEffect) continue;
    const mod = card.scoreEffect(ctx);
    chips += mod.addChips;
    addMult += mod.addMult;
    mulMult *= mod.mulMult;
  }
  const mult = (ctx.baseMult + addMult) * mulMult;
  return { chips, mult, total: chips * mult };
}
