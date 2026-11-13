import { emitMascotEvent } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';
import type { RejectKind } from '../useWordWheelSubmit';
import type { FeedbackType } from '../survival/types';

export const WHEEL_MASCOT_SLOT = 'top-[8.75rem] end-2';
// The wheel's top corner is outside the disc, so the phone mascot costs the layout nothing.
export const WHEEL_ORBIT_MASCOT_SLOT = 'top-0 end-0';

const FOUND: ReadonlySet<FeedbackType> = new Set(['valid-word', 'short-valid', 'discovery', 'target-found']);
const REJECTED: ReadonlySet<FeedbackType> = new Set(['invalid-word', 'not-on-board', 'not-in-dictionary', 'too-short', 'too-long']);

const found = (word: string): MascotEvent => ({ kind: 'word-submitted', wordLength: word.length, gemLetterUsed: false, word });

export function wheelVerdictEvent(verdict: RejectKind | 'accepted', word: string): MascotEvent | null {
  if (verdict === 'accepted') return found(word);
  if (verdict === 'found') return { kind: 'duplicate-word' };
  if (verdict === 'unknown') return null;
  return { kind: 'word-rejected' };
}

export function huntFeedbackEvent(type: FeedbackType | null, word: string | null): MascotEvent | null {
  if (!type) return null;
  if (type === 'duplicate') return { kind: 'duplicate-word' };
  if (REJECTED.has(type)) return { kind: 'word-rejected' };
  if (FOUND.has(type) && word) return found(word);
  return null;
}

/** Word Hunt has no scored combo, so the mascot's combo is found words in a row. */
export function nextHuntStreak(streak: number, type: FeedbackType | null): number {
  if (type && FOUND.has(type)) return streak + 1;
  if (type && REJECTED.has(type)) return 0;
  return streak;
}

export function emitWheelVerdict(verdict: RejectKind | 'accepted', word: string): void {
  const event = wheelVerdictEvent(verdict, word);
  if (event) emitMascotEvent(event);
}

export function emitFinalSeconds(secondsLeft: number): void {
  emitMascotEvent({ kind: 'timer-final-10s', secondsLeft });
}
