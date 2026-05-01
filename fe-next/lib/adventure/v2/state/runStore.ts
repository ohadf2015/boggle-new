import { create } from 'zustand';
import type { CombatModel, FsmState, Locale, Tile, TileId } from '../types';
import { drawTiles, refillTiles } from '../engine/tilePool';
import { hasAnyComposableWord } from '../engine/wordValidator';
import { transition, type FsmEvent } from '../fsm';
import {
  ABILITY_DEFS,
  consumeAbility,
  tickAbilityCooldowns,
  type AbilityId,
  type AbilityState,
} from '../abilities';

interface CombatStore extends CombatModel {
  locale: Locale;
  abilities: AbilityState[];
  /** When set, the player is choosing a target tile to trigger this ability. */
  pendingAbility: AbilityId | null;
  startNewBattle: (locale?: Locale, abilities?: AbilityId[]) => void;
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
  /** Enter "select target" mode for an ability. */
  setPendingAbility: (id: AbilityId | null) => void;
  /** Mark the ability as used; reset its cooldown. Clears pending. */
  consumePendingAbility: () => void;
  /** Decrement cooldown counters for all abilities (called per player-turn end). */
  tickAbilityCooldowns: () => void;
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
  locale: 'en' as Locale,
  abilities: [],
  pendingAbility: null,

  startNewBattle: (locale: Locale = 'en', equipped: AbilityId[] = ['block']) => {
    const abilityStates: AbilityState[] = equipped.map((id) => ({
      id,
      cooldownRemaining: 0,
      maxCooldown: ABILITY_DEFS[id].maxCooldown,
    }));
    set({
      heroHp: HERO_MAX_HP,
      heroMaxHp: HERO_MAX_HP,
      enemyHp: ENEMY_MAX_HP,
      enemyMaxHp: ENEMY_MAX_HP,
      enemyAtk: ENEMY_ATK,
      tiles: drawTiles(16, locale),
      fsmState: { type: 'idle' },
      locale,
      abilities: abilityStates,
      pendingAbility: null,
    });
  },

  dispatch: (event) => {
    set((s) => ({ fsmState: transition(s.fsmState, event) }));
  },

  refillUsedTiles: (usedIds) => {
    set((s) => ({ tiles: refillTiles(s.tiles, usedIds, s.locale) }));
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

  setPendingAbility: (id) => {
    set({ pendingAbility: id });
  },

  consumePendingAbility: () => {
    set((s) => {
      if (!s.pendingAbility) return s;
      return {
        abilities: consumeAbility(s.abilities, s.pendingAbility),
        pendingAbility: null,
      };
    });
  },

  tickAbilityCooldowns: () => {
    set((s) => ({ abilities: tickAbilityCooldowns(s.abilities) }));
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
      return { tiles: refillTiles(next, expired, s.locale) };
    });
  },

  rescueIfStuck: () => {
    const s = useCombatStore.getState();
    const free = s.tiles.filter((t) => !t.claimedBy);
    if (hasAnyComposableWord(free, s.locale)) return false;
    const freeIds = free.map((t) => t.id);
    set((curr) => ({ tiles: refillTiles(curr.tiles, freeIds, curr.locale) }));
    const after = useCombatStore.getState();
    const afterFree = after.tiles.filter((t) => !t.claimedBy);
    if (!hasAnyComposableWord(afterFree, after.locale)) {
      const ids = afterFree.map((t) => t.id);
      set((curr) => ({ tiles: refillTiles(curr.tiles, ids, curr.locale) }));
    }
    return true;
  },
}));
