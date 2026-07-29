import { create, type StoreApi, type UseBoundStore } from 'zustand';
import {
  INITIAL_HINT_TOKENS,
  type AudioVolume,
  type CousinId,
  type GameProgress,
  type ItemId,
  type Locale,
  type PlayerChoice,
  type RoomId,
  type RoomReward,
} from '../types';
import {
  NOOP_SUPABASE_SYNC,
  loadFromStorage,
  saveToStorage,
  STORAGE_VERSION,
  type PersistedShape,
  type SupabaseSync,
  type SupabaseSyncEvent,
} from './persistence';
import { createNotebookSlice, type NotebookSnapshot } from './notebookSlice';
import { createBeatProgressSlice } from './beatProgressSlice';
import type { ClueFragment, BeatId } from '../beats/types';

export type WordVaultState = GameProgress & {
  locale: Locale;
  reduceMotion: boolean;
  largeText: boolean;
  audioVolume: AudioVolume;
  notebook: NotebookSnapshot;
  beatProgress: Record<RoomId, BeatId[]>;
};

export type WordVaultActions = {
  startNewSession: () => void;
  solveRoom: (roomId: RoomId, reward: RoomReward) => void;
  grantItem: (itemId: ItemId) => boolean;
  earnCoins: (n: number) => void;
  spendHintToken: () => boolean;
  grantHintTokens: (n: number) => void;
  recordWordSpelled: (word: string) => void;
  redeemCousin: (id: CousinId) => void;
  setChoice: <K extends keyof PlayerChoice>(key: K, value: PlayerChoice[K]) => void;
  setLocale: (locale: Locale) => void;
  setReduceMotion: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
  setAudioVolume: (v: Partial<AudioVolume>) => void;
  addClue: (roomId: RoomId, fragment: ClueFragment) => void;
  markBeatSolved: (roomId: RoomId, beatId: BeatId) => void;
  isBeatSolved: (roomId: RoomId, beatId: BeatId) => boolean;
  cluesFor: (roomId: RoomId) => ClueFragment[];
};

export type WordVaultStoreState = WordVaultState & WordVaultActions;
export type WordVaultStore = UseBoundStore<StoreApi<WordVaultStoreState>>;

const DEFAULT_STATE: WordVaultState = {
  currentRoom: null,
  solvedRooms: [],
  redeemedCousins: [],
  memoryCoins: 0,
  hintTokens: INITIAL_HINT_TOKENS,
  permanentItems: [],
  choices: { room4_burnRecipe: null, room6_finalLine: null },
  uniqueWordsSpelled: [],
  locale: 'he',
  reduceMotion: false,
  largeText: false,
  audioVolume: { music: 0.7, sfx: 0.9 },
  notebook: { byRoom: {}, lastTapAt: 0 } as any,
  beatProgress: {} as any,
};

const snapshot = (state: WordVaultState): PersistedShape => ({
  version: STORAGE_VERSION,
  currentRoom: state.currentRoom,
  solvedRooms: [...state.solvedRooms],
  redeemedCousins: [...state.redeemedCousins],
  memoryCoins: state.memoryCoins,
  hintTokens: state.hintTokens,
  permanentItems: [...state.permanentItems],
  choices: { ...state.choices },
  uniqueWordsSpelled: [...state.uniqueWordsSpelled],
  locale: state.locale,
  reduceMotion: state.reduceMotion,
  largeText: state.largeText,
  audioVolume: { ...state.audioVolume },
});

const merge = (base: WordVaultState, persisted: Partial<PersistedShape>): WordVaultState => ({
  ...base,
  ...persisted,
  choices: { ...base.choices, ...(persisted.choices ?? {}) },
  audioVolume: { ...base.audioVolume, ...(persisted.audioVolume ?? {}) },
  solvedRooms: persisted.solvedRooms ?? base.solvedRooms,
  redeemedCousins: persisted.redeemedCousins ?? base.redeemedCousins,
  permanentItems: persisted.permanentItems ?? base.permanentItems,
  uniqueWordsSpelled: persisted.uniqueWordsSpelled ?? base.uniqueWordsSpelled,
});

const uniqueAppend = <T>(arr: T[], v: T): T[] => (arr.includes(v) ? arr : [...arr, v]);

const mergeItems = (existing: ItemId[], next?: ItemId[]): ItemId[] => {
  if (!next || next.length === 0) return existing;
  const set = new Set([...existing, ...next]);
  return Array.from(set);
};

export type CreateGameStoreOptions = {
  initialState?: Partial<WordVaultState>;
  supabaseSync?: SupabaseSync;
};

export function createGameStore(options: CreateGameStoreOptions = {}): WordVaultStore {
  const persisted = loadFromStorage();
  const baseState = merge(DEFAULT_STATE, persisted ?? {});
  const initial = { ...baseState, ...(options.initialState ?? {}) };
  const sync = options.supabaseSync ?? NOOP_SUPABASE_SYNC;

  const notebookSlice = createNotebookSlice();
  const beatProgress = createBeatProgressSlice();

  const store = create<WordVaultStoreState>((set, get) => {
    const persistAndSync = (event?: SupabaseSyncEvent) => {
      const snap = snapshot(get());
      saveToStorage(snap);
      if (event) sync(event, snap);
    };

    return {
      ...initial,

      startNewSession: () => {
        set({ ...DEFAULT_STATE });
        persistAndSync();
      },

      solveRoom: (roomId, reward) => {
        const state = get();
        if (state.solvedRooms.includes(roomId)) return;
        const items = mergeItems(state.permanentItems, reward.items);
        set({
          solvedRooms: [...state.solvedRooms, roomId],
          memoryCoins: state.memoryCoins + (reward.coins ?? 0),
          permanentItems: items,
        });
        persistAndSync({ type: 'room-solve', roomId });
        if (reward.items) {
          for (const itemId of reward.items) {
            sync({ type: 'item-earned', itemId }, snapshot(get()));
          }
        }
      },

      grantItem: (itemId) => {
        const state = get();
        if (state.permanentItems.includes(itemId)) return false;
        set({ permanentItems: [...state.permanentItems, itemId] });
        persistAndSync({ type: 'item-earned', itemId });
        return true;
      },

      earnCoins: (n) => {
        if (n === 0) return;
        set({ memoryCoins: get().memoryCoins + n });
        persistAndSync();
      },

      spendHintToken: () => {
        const tokens = get().hintTokens;
        if (tokens <= 0) return false;
        set({ hintTokens: tokens - 1 });
        persistAndSync();
        return true;
      },

      grantHintTokens: (n) => {
        if (n <= 0) return;
        set({ hintTokens: get().hintTokens + n });
        persistAndSync();
      },

      recordWordSpelled: (word) => {
        const list = get().uniqueWordsSpelled;
        if (list.includes(word)) return;
        set({ uniqueWordsSpelled: [...list, word] });
        persistAndSync();
      },

      redeemCousin: (id) => {
        const next = uniqueAppend(get().redeemedCousins, id);
        if (next === get().redeemedCousins) return;
        set({ redeemedCousins: next });
        persistAndSync({ type: 'cousin-redeemed', cousinId: id });
      },

      setChoice: (key, value) => {
        set({ choices: { ...get().choices, [key]: value } });
        persistAndSync();
      },

      setLocale: (locale) => {
        set({ locale });
        persistAndSync({ type: 'settings-changed' });
      },

      setReduceMotion: (v) => {
        set({ reduceMotion: v });
        persistAndSync({ type: 'settings-changed' });
      },

      setLargeText: (v) => {
        set({ largeText: v });
        persistAndSync({ type: 'settings-changed' });
      },

      setAudioVolume: (v) => {
        set({ audioVolume: { ...get().audioVolume, ...v } });
        persistAndSync({ type: 'settings-changed' });
      },

      addClue: (roomId, fragment) => {
        notebookSlice.addClue(roomId as any, fragment);
        set((s) => ({ ...s, notebook: notebookSlice.snapshot() }));
      },

      markBeatSolved: (roomId, beatId) => {
        beatProgress.markSolved(roomId as any, beatId);
        set((s) => ({
          ...s,
          beatProgress: { ...s.beatProgress, [roomId]: beatProgress.solvedBeats(roomId as any) },
        }));
      },

      isBeatSolved: (roomId, beatId) => beatProgress.isSolved(roomId as any, beatId),

      cluesFor: (roomId) => notebookSlice.cluesFor(roomId as any),
    };
  });

  return store;
}

let singleton: WordVaultStore | null = null;

export function getGameStore(): WordVaultStore {
  if (!singleton) singleton = createGameStore();
  return singleton;
}

export function resetGameStoreForTests(): void {
  singleton = null;
}
