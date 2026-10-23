/** Standing run-wide buffs the HUD keeps on screen (hearts and hints already have their own controls). */
import { secondsBonus, goldMult, type RelicId } from './relics';

export interface RunBuff { id: RelicId; kind: 'time' | 'gold'; text: string }

export function runBuffs(relics: readonly string[]): RunBuff[] {
  const out: RunBuff[] = [];
  const secs = secondsBonus(relics);
  if (secs > 0) out.push({ id: 'hourglass', kind: 'time', text: `+${secs}s` });
  const g = goldMult(relics);
  if (g > 1) out.push({ id: 'gold-tooth', kind: 'gold', text: `×${g}` });
  return out;
}
