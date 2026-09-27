/**
 * One feedback channel for accepted / rejected words in multiplayer.
 *
 * Two hooks receive word events — `usePlayerWordEvents` (joiner) and
 * `useHostWordEvents` (host playing). Both write here, and every juice surface
 * (MpScoreChip bump, "+N" floaters, MpCallouts) reads here, so the two paths
 * cannot drift (pitfall class 3). A standalone store: the shared game store
 * (`hooks/gameState/store.ts`) is read-only for MP work.
 *
 * Points are ALWAYS the server's `wordAccepted.score` — it already includes the
 * combo multiplier (`scoreAcceptedWord().total`); `comboBonus` is reported for
 * display only and must never be added again.
 */
import { create } from 'zustand';

export type MpRejectReason = 'invalid' | 'too-short' | 'not-on-board' | 'already-found' | 'found-by-other';

export interface MpLastWord {
  id: string;
  word: string;
  points: number;
  comboLevel: number;
  ts: number;
}

export interface MpLastReject {
  id: string;
  word: string;
  reason: MpRejectReason;
  /** found-by-other: who got it first. */
  foundBy?: string;
  /** found-by-other: the partial credit the server gave. */
  points?: number;
  ts: number;
}

interface MpFeedbackState {
  lastWord: MpLastWord | null;
  lastReject: MpLastReject | null;
}

export const useMpFeedbackStore = create<MpFeedbackState>()(() => ({
  lastWord: null,
  lastReject: null,
}));

let seq = 0;
const nextId = (): string => `mpf-${++seq}`;

/** The points to show for a `wordAccepted` payload: the server's score, nothing added. */
export function acceptedPoints(data: { score?: number; comboBonus?: number }): number {
  return typeof data.score === 'number' && Number.isFinite(data.score) ? data.score : 0;
}

export function recordWordAccepted(data: { word: string; score?: number; comboLevel?: number }): void {
  useMpFeedbackStore.setState({
    lastWord: {
      id: nextId(),
      word: data.word,
      points: acceptedPoints(data),
      comboLevel: data.comboLevel ?? 0,
      ts: Date.now(),
    },
  });
}

export function recordWordRejected(
  word: string,
  reason: MpRejectReason,
  extra: { foundBy?: string; points?: number } = {},
): void {
  useMpFeedbackStore.setState({
    lastReject: { id: nextId(), word, reason, ...extra, ts: Date.now() },
  });
}

export function resetMpFeedback(): void {
  useMpFeedbackStore.setState({ lastWord: null, lastReject: null });
}
