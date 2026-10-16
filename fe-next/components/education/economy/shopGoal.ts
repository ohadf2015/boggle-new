import { POWER_UP_IDS, POWER_UPS, type ClassroomEconomySnapshot, type PowerUpId } from '@/shared/constants/classroomEconomy';

export type ShopGoal =
  | { kind: 'save'; id: PowerUpId; cost: number; missing: number }
  | { kind: 'ready'; id: PowerUpId; cost: number };

const BY_PRICE = [...POWER_UP_IDS].sort((a, b) => POWER_UPS[a].cost - POWER_UPS[b].cost);

/** The cheapest power-up the student cannot yet afford, or the cheapest one if they can afford all. */
export function shopGoal(cash: number): ShopGoal {
  const next = BY_PRICE.find((id) => POWER_UPS[id].cost > cash);
  if (next === undefined) {
    const id = BY_PRICE[0];
    return { kind: 'ready', id, cost: POWER_UPS[id].cost };
  }
  const cost = POWER_UPS[next].cost;
  return { kind: 'save', id: next, cost, missing: cost - cash };
}

/** Between rounds double cash has no round to run in, and a held shield cannot be bought twice. */
export function canBuyBetweenRounds(snapshot: Pick<ClassroomEconomySnapshot, 'cash' | 'shieldHeld'>): boolean {
  return POWER_UP_IDS.some(
    (id) => id !== 'doubleCash' && !(id === 'streakShield' && snapshot.shieldHeld) && POWER_UPS[id].cost <= snapshot.cash
  );
}
