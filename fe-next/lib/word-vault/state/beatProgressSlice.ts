import type { BeatId, RoomId } from '../beats/types';

export type BeatProgressSlice = {
  isSolved: (roomId: RoomId, beatId: BeatId) => boolean;
  markSolved: (roomId: RoomId, beatId: BeatId) => void;
  solvedBeats: (roomId: RoomId) => BeatId[];
  clearRoom: (roomId: RoomId) => void;
};

export function createBeatProgressSlice(): BeatProgressSlice {
  const state: Record<RoomId, Set<BeatId>> = {} as Record<RoomId, Set<BeatId>>;
  const ensure = (r: RoomId) => (state[r] ??= new Set());
  return {
    isSolved: (r, b) => ensure(r).has(b),
    markSolved: (r, b) => { ensure(r).add(b); },
    solvedBeats: (r) => Array.from(ensure(r)),
    clearRoom: (r) => { delete state[r]; },
  };
}
