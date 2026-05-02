import type { LogicSequenceRiddle } from '../types';

export function isCorrectOrder(
  riddle: LogicSequenceRiddle,
  attempt: string[],
): boolean {
  if (attempt.length !== riddle.correctOrder.length) return false;
  for (let i = 0; i < attempt.length; i += 1) {
    if (attempt[i] !== riddle.correctOrder[i]) return false;
  }
  return true;
}

export function correctPrefixLength(
  riddle: LogicSequenceRiddle,
  attempt: string[],
): number {
  let n = 0;
  for (let i = 0; i < Math.min(attempt.length, riddle.correctOrder.length); i += 1) {
    if (attempt[i] === riddle.correctOrder[i]) n += 1;
    else break;
  }
  return n;
}
