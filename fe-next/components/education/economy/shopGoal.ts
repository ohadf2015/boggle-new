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

export type PowerUpStatus = { kind: 'owned' } | { kind: 'roundOnly' } | { kind: 'short'; missing: number } | { kind: 'ready' };

type ShopView = Pick<ClassroomEconomySnapshot, 'cash' | 'shieldHeld' | 'doubleCashMsLeft'>;

/** What one shop card says: held, round-only, how much is missing, or buyable now. */
export function powerUpStatus(snapshot: ShopView, id: PowerUpId, between = false): PowerUpStatus {
  if (id === 'streakShield' && snapshot.shieldHeld) return { kind: 'owned' };
  if (id === 'doubleCash' && snapshot.doubleCashMsLeft > 0) return { kind: 'owned' };
  if (id === 'doubleCash' && between) return { kind: 'roundOnly' };
  const missing = POWER_UPS[id].cost - snapshot.cash;
  return missing > 0 ? { kind: 'short', missing } : { kind: 'ready' };
}

export function readyPowerUpCount(snapshot: ShopView, between = false): number {
  return POWER_UP_IDS.filter((id) => powerUpStatus(snapshot, id, between).kind === 'ready').length;
}
