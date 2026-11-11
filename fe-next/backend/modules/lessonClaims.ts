/**
 * Lesson Word Race: the placed lesson words are a shared list and the first student to find each
 * one claims it. Pure state + one broadcast helper, so the word handler's hook-in is a single call.
 */

import type { Server } from 'socket.io';
import type { Language } from '@/shared/types';
import type { ClassroomTeam } from '@/shared/utils/teamBattle';
import {
  LESSON_CLAIM_BONUS,
  LESSON_RACE_MAX_SLOTS,
  LESSON_RACE_MIN_HUMANS,
  LESSON_RACE_MODES,
} from '@/shared/constants/lessonScoring';
import {
  LESSON_WORD_CLAIMED_EVENT,
  type LessonClaim,
  type LessonClaimAvatar,
  type LessonClaimsView,
  type LessonWordClaimedEvent,
} from '@/shared/types/lessonClaims';
import { lessonWordKey } from '@/shared/utils/wordNormalization';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';

export interface LessonClaimsState {
  roundId: number;
  language: Language;
  slots: Array<{ key: string; word: string; claim: LessonClaim | null }>;
  teams: ClassroomTeam[] | null;
}

export interface StartLessonClaimsInput {
  placedWords: readonly string[];
  language: Language;
  gameMode: string;
  playingHumans: number;
  bots?: number;
  roundId: number;
  teams: ClassroomTeam[] | null | undefined;
}

export function startLessonClaims(input: StartLessonClaimsInput): LessonClaimsState | null {
  if (!LESSON_RACE_MODES.has(input.gameMode)) return null;
  if (input.playingHumans < LESSON_RACE_MIN_HUMANS && !input.bots) return null;
  const slots: LessonClaimsState['slots'] = [];
  const seen = new Set<string>();
  for (const word of input.placedWords) {
    const key = lessonWordKey(word, input.language);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    slots.push({ key, word, claim: null });
    if (slots.length === LESSON_RACE_MAX_SLOTS) break;
  }
  if (slots.length === 0) return null;
  return { roundId: input.roundId, language: input.language, slots, teams: input.teams ?? null };
}

/** The teacher watching a projector is not a contestant; bots never make a race. */
export function countPlayingHumans(users: ReadonlyArray<{ isBot?: boolean; isHost?: boolean }>, hostWatches: boolean): number {
  return users.filter((u) => !u.isBot && !(hostWatches && u.isHost)).length;
}

export interface ArmLessonClaimsInput {
  placedWords: readonly string[];
  language: Language;
  gameMode: string;
  users: ReadonlyArray<{ isBot?: boolean; isHost?: boolean; isPractice?: boolean }>;
  hostWatches: boolean;
  extras: Record<string, unknown>;
}

/** Deal-time hook-in, run for every mode so a stale race can never outlive its round. */
export function armLessonClaims(game: { gameSessionId?: number; lessonClaims?: LessonClaimsState | null }, input: ArmLessonClaimsInput): void {
  const teams = (input.extras.classroom as { teams?: ClassroomTeam[] } | undefined)?.teams ?? null;
  game.lessonClaims = startLessonClaims({
    placedWords: input.placedWords,
    language: input.language,
    gameMode: input.gameMode,
    playingHumans: countPlayingHumans(input.users, input.hostWatches),
    bots: input.users.filter((u) => u.isBot).length,
    roundId: game.gameSessionId ?? 0,
    teams,
  });
}

interface AvatarLike { emoji?: unknown; color?: unknown; avatarImage?: unknown }

/** Fifty phones hear every claim: send the three display fields, never a custom avatar config. */
function slimAvatar(avatar: AvatarLike | null | undefined): LessonClaimAvatar | null {
  if (!avatar) return null;
  const out: LessonClaimAvatar = {};
  if (typeof avatar.emoji === 'string') out.emoji = avatar.emoji;
  if (typeof avatar.color === 'string') out.color = avatar.color;
  if (typeof avatar.avatarImage === 'string') out.avatarImage = avatar.avatarImage;
  return Object.keys(out).length > 0 ? out : null;
}

export interface ClaimInput {
  word: string;
  username: string;
  fromLesson: boolean;
  isBot?: boolean;
  botsMayClaim?: boolean;
  avatar?: AvatarLike | null;
  roundId: number;
  inProgress: boolean;
}

export function claimLessonWord(state: LessonClaimsState, input: ClaimInput): LessonWordClaimedEvent | null {
  if (!input.fromLesson || (input.isBot && !input.botsMayClaim) || !input.inProgress || input.roundId !== state.roundId) return null;
  const key = lessonWordKey(input.word, state.language);
  const index = state.slots.findIndex((s) => s.key === key);
  if (index < 0) return null;
  const slot = state.slots[index];
  if (slot.claim) return null;
  const lower = input.username.toLowerCase();
  const team = state.teams?.find((t) => t.memberNames.some((n) => n.toLowerCase() === lower));
  slot.claim = { word: slot.word, username: input.username, avatar: slimAvatar(input.avatar), teamId: team ? team.id : null };
  return {
    roundId: state.roundId,
    index,
    ...slot.claim,
    claimedCount: state.slots.filter((s) => s.claim).length,
    total: state.slots.length,
    bonus: LESSON_CLAIM_BONUS,
  };
}

export function lessonClaimsView(state: LessonClaimsState): LessonClaimsView {
  return {
    roundId: state.roundId,
    total: state.slots.length,
    claimedCount: state.slots.filter((s) => s.claim).length,
    slots: state.slots.map((s, index) => {
      const chars = Array.from(s.word);
      return { index, first: (chars[0] ?? '').toUpperCase(), length: chars.length, claim: s.claim };
    }),
  };
}

interface RaceGame {
  lessonClaims?: LessonClaimsState | null;
  gameSessionId?: number;
  gameState?: string;
  users?: Record<string, { avatar?: AvatarLike | null; isBot?: boolean; isHost?: boolean; isPractice?: boolean } | undefined>;
}

function hasRealStudent(game: RaceGame): boolean {
  return Object.values(game.users ?? {}).some((u) => !!u && !u.isBot && !u.isHost && !u.isPractice);
}

function claimAndAnnounce(io: Server, gameCode: string, game: RaceGame & { lessonClaims: LessonClaimsState }, input: { word: string; username: string; botsMayClaim: boolean }): number {
  const user = game.users?.[input.username];
  const event = claimLessonWord(game.lessonClaims, {
    word: input.word,
    username: input.username,
    fromLesson: true,
    isBot: !!user?.isBot,
    botsMayClaim: input.botsMayClaim,
    avatar: user?.avatar ?? null,
    roundId: game.gameSessionId ?? 0,
    inProgress: game.gameState === 'in-progress',
  });
  if (!event) return 0;
  broadcastToRoom(io, getGameRoom(gameCode), LESSON_WORD_CLAIMED_EVENT, event);
  return event.bonus;
}

/** Hook-in for the accepted-word path: records the claim, tells the room, returns the bonus to add. */
export function onLessonWordAccepted(
  io: Server,
  gameCode: string,
  game: RaceGame,
  input: { word: string; username: string; fromLesson: boolean },
): number {
  if (!game.lessonClaims || !input.fromLesson) return 0;
  return claimAndAnnounce(io, gameCode, game as RaceGame & { lessonClaims: LessonClaimsState }, { ...input, botsMayClaim: false });
}

/** Bot words skip the word handler. A bot claims only while no real student is seated, so it never takes a student's bonus. */
export function onBotWordPlayed(io: Server, gameCode: string, game: RaceGame, input: { word: string; username: string }): number {
  if (!game.lessonClaims || !game.users?.[input.username]?.isBot || hasRealStudent(game)) return 0;
  return claimAndAnnounce(io, gameCode, game as RaceGame & { lessonClaims: LessonClaimsState }, { ...input, botsMayClaim: true });
}
