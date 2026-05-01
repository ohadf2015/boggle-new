import type { FsmState, TileId } from './types';

export type FsmEvent =
  | { type: 'START_TURN' }
  | { type: 'TILE_TAP'; tileId: TileId; letter: string }
  | { type: 'TILE_UNDO'; tileId: TileId }
  | { type: 'SUBMIT' }
  | { type: 'RESOLVE'; damage: number }
  | { type: 'PLAYER_RESOLVED'; enemyHpRemaining: number }
  | { type: 'BOT_PICKED'; word: string; tilesClaimed: TileId[]; damage: number }
  | { type: 'BOT_RESOLVED'; heroHpRemaining: number }
  | { type: 'TILE_REFRESH_DONE' };

export function transition(state: FsmState, event: FsmEvent): FsmState {
  switch (state.type) {
    case 'idle':
      if (event.type === 'START_TURN') {
        return { type: 'player_compose', word: '', tilesUsed: [] };
      }
      return state;

    case 'player_compose':
      if (event.type === 'TILE_TAP') {
        if (state.tilesUsed.includes(event.tileId)) return state;
        return {
          type: 'player_compose',
          word: state.word + event.letter,
          tilesUsed: [...state.tilesUsed, event.tileId],
        };
      }
      if (event.type === 'TILE_UNDO') {
        const idx = state.tilesUsed.indexOf(event.tileId);
        if (idx === -1) return state;
        return {
          type: 'player_compose',
          word: state.word.slice(0, idx) + state.word.slice(idx + 1),
          tilesUsed: state.tilesUsed.filter((id) => id !== event.tileId),
        };
      }
      if (event.type === 'SUBMIT') {
        if (state.word.length < 3) return state;
        return { type: 'player_submit', word: state.word, tilesUsed: state.tilesUsed };
      }
      return state;

    case 'player_submit':
      if (event.type === 'RESOLVE') {
        return { type: 'player_resolve', damage: event.damage, tilesUsed: state.tilesUsed };
      }
      return state;

    case 'player_resolve':
      if (event.type === 'PLAYER_RESOLVED') {
        if (event.enemyHpRemaining <= 0) return { type: 'victory' };
        // Move into bot's claim phase, awaiting BOT_PICKED with the word.
        return { type: 'bot_compose', word: '', tilesClaimed: [], damage: 0 };
      }
      return state;

    case 'bot_compose':
      if (event.type === 'BOT_PICKED') {
        return {
          type: 'bot_compose',
          word: event.word,
          tilesClaimed: event.tilesClaimed,
          damage: event.damage,
        };
      }
      // After the bot's word is shown, transition to bot_resolve which applies damage.
      if (event.type === 'BOT_RESOLVED') {
        // Skipped path: bot found no word — no damage, jump straight to refresh.
        return { type: 'tile_refresh', replacedTileIds: [] };
      }
      return state;

    case 'bot_resolve':
      if (event.type === 'BOT_RESOLVED') {
        if (event.heroHpRemaining <= 0) return { type: 'defeat' };
        return { type: 'tile_refresh', replacedTileIds: [] };
      }
      return state;

    case 'tile_refresh':
      if (event.type === 'TILE_REFRESH_DONE') {
        return { type: 'player_compose', word: '', tilesUsed: [] };
      }
      return state;

    case 'victory':
    case 'defeat':
      return state;

    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Convenience helper: from `bot_compose` (after BOT_PICKED), advance to `bot_resolve`. */
export function botComposeToResolve(state: FsmState): FsmState {
  if (state.type !== 'bot_compose') return state;
  return { type: 'bot_resolve', damage: state.damage };
}
