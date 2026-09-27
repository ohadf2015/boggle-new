import { AVATAR_COLORS, AVATAR_EMOJIS } from '@/shared/constants/gameConstants';
import {
  PARTY_BOARD_SIZES,
  PARTY_MAX_PLAYERS,
  PARTY_MAX_ROUNDS,
  PARTY_MAX_TIMER,
  PARTY_MIN_PLAYERS,
  PARTY_MIN_ROUNDS,
  PARTY_MIN_TIMER,
  type PartyPlayer,
  type PartySetup,
} from './types';

export type SetupError =
  | 'minPlayers'
  | 'maxPlayers'
  | 'emptyName'
  | 'nameTaken'
  | 'rounds'
  | 'timer'
  | 'boardSize';

export interface SetupValidation {
  ok: boolean;
  errors: SetupError[];
}

function playerId(index: number): string {
  return `p${index + 1}`;
}

export function makePlayer(index: number, name?: string): PartyPlayer {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length] ?? '#FF6B6B';
  const emoji = AVATAR_EMOJIS[index % AVATAR_EMOJIS.length] ?? '🦊';
  return {
    id: playerId(index),
    name: (name ?? `Player ${index + 1}`).trim(),
    color,
    emoji,
  };
}

export function defaultPartySetup(language: string): PartySetup {
  return {
    players: [makePlayer(0), makePlayer(1)],
    roundCount: 3,
    rows: 4,
    cols: 4,
    language,
    timerSeconds: 60,
  };
}

export function validatePartySetup(setup: PartySetup): SetupValidation {
  const errors: SetupError[] = [];
  const count = setup.players.length;
  if (count < PARTY_MIN_PLAYERS) errors.push('minPlayers');
  if (count > PARTY_MAX_PLAYERS) errors.push('maxPlayers');

  const names = setup.players.map((p) => p.name.trim().toLocaleLowerCase());
  if (setup.players.some((p) => p.name.trim().length === 0)) errors.push('emptyName');
  if (new Set(names.filter(Boolean)).size !== names.filter(Boolean).length) {
    errors.push('nameTaken');
  }

  if (
    !Number.isInteger(setup.roundCount) ||
    setup.roundCount < PARTY_MIN_ROUNDS ||
    setup.roundCount > PARTY_MAX_ROUNDS
  ) {
    errors.push('rounds');
  }

  if (
    !Number.isInteger(setup.timerSeconds) ||
    setup.timerSeconds < PARTY_MIN_TIMER ||
    setup.timerSeconds > PARTY_MAX_TIMER
  ) {
    errors.push('timer');
  }

  const sizeOk =
    setup.rows === setup.cols &&
    (PARTY_BOARD_SIZES as readonly number[]).includes(setup.rows);
  if (!sizeOk) errors.push('boardSize');

  return { ok: errors.length === 0, errors };
}
