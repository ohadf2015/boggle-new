import type { PotionId } from '@/lib/adventure/play/relics';

export interface PotionContext {
  playing: boolean;
  inFight: boolean;
  /** Run hearts (outside a fight). */
  hp: number;
  maxHp: number;
  /** Fight hearts — the combat stage owns these while a foe is up. */
  fightHp?: number;
  fightMaxHp?: number;
}

/** Can this flask do anything right now? A heal at full hearts would be silently wasted. */
export function potionUsable(id: PotionId, c: PotionContext): boolean {
  if (!c.playing) return false;
  if (id === 'cleanse') return c.inFight;
  if (id === 'heal') {
    const hp = c.inFight ? c.fightHp ?? c.hp : c.hp;
    const max = c.inFight ? c.fightMaxHp ?? c.maxHp : c.maxHp;
    return hp < max;
  }
  return true;
}
