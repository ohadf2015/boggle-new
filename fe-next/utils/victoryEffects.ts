import { fireRankConfetti, fireFireworks, fireVictoryConfetti } from './confettiUtils';

export function fireEquippedVictoryEffect(rank: number, effectId: string | null): void {
  if (effectId === 'victory-fireworks') {
    fireFireworks(3, 2000);
  } else if (effectId === 'victory-lightning') {
    fireVictoryConfetti();
  } else {
    fireRankConfetti(rank, 'light');
  }
}
