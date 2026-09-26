/**
 * Selector hooks over the MP word-feedback channel (see lib/multiplayer/mpFeedback).
 * Subscribe to ONE lane each so a rejection never re-renders the score chip.
 */
import { useMpFeedbackStore, type MpLastReject, type MpLastWord } from '@/lib/multiplayer/mpFeedback';

export function useMpLastWord(): MpLastWord | null {
  return useMpFeedbackStore((s) => s.lastWord);
}

export function useMpLastReject(): MpLastReject | null {
  return useMpFeedbackStore((s) => s.lastReject);
}

export {
  recordWordAccepted,
  recordWordRejected,
  resetMpFeedback,
  acceptedPoints,
} from '@/lib/multiplayer/mpFeedback';
