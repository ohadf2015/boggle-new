/**
 * Lesson Word Race, client side: the server's claim list for this round plus live claims.
 * A micro-store (like the pressure dials) because startGame lands before the in-game views mount;
 * the one writer for round starts is the startGame listener in useMultiplayerSocket.
 */
import { create } from 'zustand';
import type { LessonClaimsView, LessonWordClaimedEvent } from '@/shared/types/lessonClaims';

interface LessonClaimsState {
  view: LessonClaimsView | null;
  lastClaim: (LessonWordClaimedEvent & { seq: number }) | null;
}

export const useLessonClaimsStore = create<LessonClaimsState>(() => ({ view: null, lastClaim: null }));

let seq = 0;

function isView(value: unknown): value is LessonClaimsView {
  const v = value as LessonClaimsView | null;
  return !!v && typeof v.roundId === 'number' && typeof v.total === 'number' && Array.isArray(v.slots);
}

/** Every start-shaped payload (start, retry, reconnect, late join, recovery) replaces the list; absent = no race. */
export function ingestLessonClaimsRound(payload: { lessonClaims?: unknown } | null | undefined): void {
  const next = isView(payload?.lessonClaims) ? payload.lessonClaims : null;
  const { lastClaim } = useLessonClaimsStore.getState();
  useLessonClaimsStore.setState({ view: next, lastClaim: next && lastClaim?.roundId === next.roundId ? lastClaim : null });
}

export function ingestLessonClaim(event: LessonWordClaimedEvent | null | undefined): void {
  const { view } = useLessonClaimsStore.getState();
  if (!event || !view || event.roundId !== view.roundId) return;
  const slot = view.slots[event.index];
  if (!slot || slot.claim) return;
  const claim = { word: event.word, username: event.username, avatar: event.avatar, teamId: event.teamId };
  const slots = view.slots.map((s) => (s.index === event.index ? { ...s, claim } : s));
  useLessonClaimsStore.setState({
    view: { ...view, slots, claimedCount: slots.filter((s) => s.claim).length },
    lastClaim: { ...event, seq: ++seq },
  });
}

export function useLessonClaims(): LessonClaimsView | null {
  return useLessonClaimsStore((s) => s.view);
}

export function useLastLessonClaim(): LessonClaimsState['lastClaim'] {
  return useLessonClaimsStore((s) => s.lastClaim);
}
