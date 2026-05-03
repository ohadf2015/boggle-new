import type { ClueFragment, RoomId } from '../beats/types';

export type NotebookSnapshot = {
  byRoom: Record<RoomId, ClueFragment[]>;
  lastTapAt: number;
};

export type NotebookSlice = {
  addClue: (roomId: RoomId, fragment: ClueFragment) => void;
  hasClue: (roomId: RoomId, fragmentId: string) => boolean;
  cluesFor: (roomId: RoomId) => ClueFragment[];
  clearRoom: (roomId: RoomId) => void;
  snapshot: () => NotebookSnapshot;
};

export function createNotebookSlice(): NotebookSlice {
  const state: NotebookSnapshot = {
    byRoom: {} as Record<RoomId, ClueFragment[]>,
    lastTapAt: 0,
  };

  return {
    addClue(roomId, fragment) {
      const existing = state.byRoom[roomId] ?? [];
      if (existing.some((f) => f.id === fragment.id)) return;
      state.byRoom[roomId] = [...existing, fragment];
      state.lastTapAt = Date.now();
    },
    hasClue(roomId, fragmentId) {
      return (state.byRoom[roomId] ?? []).some((f) => f.id === fragmentId);
    },
    cluesFor(roomId) {
      return state.byRoom[roomId] ?? [];
    },
    clearRoom(roomId) {
      delete state.byRoom[roomId];
    },
    snapshot() {
      return { byRoom: { ...state.byRoom }, lastTapAt: state.lastTapAt };
    },
  };
}
