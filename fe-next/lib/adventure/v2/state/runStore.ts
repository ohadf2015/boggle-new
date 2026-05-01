import { create } from 'zustand';
import type { CombatModel, FsmState, Tile, TileId } from '../types';
import { drawTiles, refillTiles } from '../engine/tilePool';
import { hasAnyComposableWord } from '../engine/wordValidator';
import { transition, type FsmEvent } from '../fsm';

interface CombatStore extends CombatModel {
  startNewBattle: () => void;
  dispatch: (event: FsmEvent) => void;
  refillUsedTiles: (usedIds: TileId[]) => void;
  applyHeroDamage: (dmg: number) => void;
  applyEnemyDamage: (dmg: number) => void;
  /** Mark tiles as bot-claimed for N turns (final, locked). */
  claimTilesForBot: (tileIds: TileId[], turns: number) => void;
  /** Decrement claim counters; refresh tiles whose counter hits 0. */
  tickClaimDecay: () => void;
  /** If no valid word can be made from free tiles, refresh ALL free tiles. Returns true if it triggered. */
  rescueIfStuck: () => boolean;
  /** Mark a tile as bot-targeted (visible reveal step, not yet locked). */
  targetTileForBot: (tileId: TileId) => void;
  /** Clear all bot targets (e.g. plan invalidated). */
  clearBotTargets: () => void;
  /** Convert bot-targeted tiles to claimed (final lock); used on plan completion. */
  finalizeBotClaim: (tileIds: TileId[], turns: number) => void;
  /** Force terminal state. Used when hero HP hits 0 outside a regular FSM transition. */
  setDefeat: () => void;
}

const HERO_MAX_HP = 30;
const ENEMY_MAX_HP = 25;
const ENEMY_ATK = 4;
const BOT_CLAIM_TURNS = 1;

export const useCombatStore = create<CombatStore>((set) => ({
  heroHp: HERO_MAX_HP,
  heroMaxHp: HERO_MAX_HP,
  enemyHp: ENEMY_MAX_HP,
  enemyMaxHp: ENEMY_MAX_HP,
  enemyAtk: ENEMY_ATK,
  tiles: [],
  fsmState: { type: 'idle' } as FsmState,

  startNewBattle: () => {
    set({
      heroHp: HERO_MAX_HP,
      heroMaxHp: HERO_MAX_HP,
      enemyHp: ENEMY_MAX_HP,
      enemyMaxHp: ENEMY_MAX_HP,
      enemyAtk: ENEMY_ATK,
      tiles: drawTiles(16, 'en'),
      fsmState: { type: 'idle' },
    });
  },

  dispatch: (event) => {
    set((s) => ({ fsmState: transition(s.fsmState, event) }));
  },

  refillUsedTiles: (usedIds) => {
    set((s) => ({ tiles: refillTiles(s.tiles, usedIds, 'en') }));
  },

  applyHeroDamage: (dmg) => {
    set((s) => ({ heroHp: Math.max(0, s.heroHp - dmg) }));
  },

  targetTileForBot: (tileId) => {
    set((s) => ({
      tiles: s.tiles.map((t) =>
        t.id === tileId ? { ...t, targetedBy: 'bot' as const } : t,
      ),
    }));
  },

  clearBotTargets: () => {
    set((s) => ({
      tiles: s.tiles.map((t) =>
        t.targetedBy ? { ...t, targetedBy: null } : t,
      ),
    }));
  },

  finalizeBotClaim: (tileIds, turns = 1) => {
    set((s) => ({
      tiles: s.tiles.map((t) =>
        tileIds.includes(t.id)
          ? { ...t, targetedBy: null, claimedBy: 'bot' as const, claimTurnsRemaining: turns }
          : t,
      ),
    }));
  },

  setDefeat: () => {
    set({ fsmState: { type: 'defeat' } });
  },

  applyEnemyDamage: (dmg) => {
    set((s) => ({ enemyHp: Math.max(0, s.enemyHp - dmg) }));
  },

  claimTilesForBot: (tileIds, turns = BOT_CLAIM_TURNS) => {
    set((s) => ({
      tiles: s.tiles.map((t) =>
        tileIds.includes(t.id)
          ? { ...t, claimedBy: 'bot' as const, claimTurnsRemaining: turns }
          : t,
      ),
    }));
  },

  tickClaimDecay: () => {
    set((s) => {
      const expired: TileId[] = [];
      const next: Tile[] = s.tiles.map((t) => {
        if (!t.claimedBy) return t;
        const remaining = (t.claimTurnsRemaining ?? 0) - 1;
        if (remaining <= 0) {
          expired.push(t.id);
          return { ...t, claimedBy: null, claimTurnsRemaining: 0 };
        }
        return { ...t, claimTurnsRemaining: remaining };
      });
      return { tiles: refillTiles(next, expired, 'en') };
    });
  },

  rescueIfStuck: () => {
    const s = useCombatStore.getState();
    const free = s.tiles.filter((t) => !t.claimedBy);
    if (hasAnyComposableWord(free)) return false;
    // No valid word possible — refresh all free tiles
    const freeIds = free.map((t) => t.id);
    set((curr) => ({ tiles: refillTiles(curr.tiles, freeIds, 'en') }));
    // Recurse once if STILL stuck (extremely unlikely given dict)
    const after = useCombatStore.getState();
    const afterFree = after.tiles.filter((t) => !t.claimedBy);
    if (!hasAnyComposableWord(afterFree)) {
      const ids = afterFree.map((t) => t.id);
      set((curr) => ({ tiles: refillTiles(curr.tiles, ids, 'en') }));
    }
    return true;
  },
}));
