import { create } from 'zustand';
import type { CombatModel, FsmState, TileId } from '../types';
import { drawTiles, refillTiles } from '../engine/tilePool';
import { transition, type FsmEvent } from '../fsm';

interface CombatStore extends CombatModel {
  startNewBattle: () => void;
  dispatch: (event: FsmEvent) => void;
  refillUsedTiles: (usedIds: TileId[]) => void;
  applyHeroDamage: (dmg: number) => void;
  applyEnemyDamage: (dmg: number) => void;
}

const HERO_MAX_HP = 30;
const ENEMY_MAX_HP = 25;
const ENEMY_ATK = 4;

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

  applyEnemyDamage: (dmg) => {
    set((s) => ({ enemyHp: Math.max(0, s.enemyHp - dmg) }));
  },
}));
