export const GAME_ENDED_EVENT = 'lc:game-ended';

export function signalGameEnded(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GAME_ENDED_EVENT));
}
