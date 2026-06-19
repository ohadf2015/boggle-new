const KEY = 'lexiclash:alchemy:streakPB';

export function getAlchemyStreakPB(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(KEY) ?? '0', 10) || 0;
}

export function setAlchemyStreakPB(n: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, String(n));
}

export function checkAndUpdatePB(streak: number): { isNewPB: boolean; prevPB: number } {
  const prevPB = getAlchemyStreakPB();
  if (streak > prevPB) {
    setAlchemyStreakPB(streak);
    return { isNewPB: true, prevPB };
  }
  return { isNewPB: false, prevPB };
}
