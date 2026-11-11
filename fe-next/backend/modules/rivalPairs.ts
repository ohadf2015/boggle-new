import { RIVAL_EVENTS, type RivalAvatar, type RivalFlipPayload, type RivalUpdatePayload, type RivalView } from '@/shared/types/rivalry';

export const RIVAL_FLIP_COOLDOWN_MS = 8_000;

// Quiz/crossword rank by something other than playerScores; wheel-rush/wordcraft phones have no chip mount yet.
export const RIVALRY_OFF_MODES: ReadonlySet<string> = new Set(['vocab-quiz', 'crossword', 'wheel-rush', 'wordcraft']);

const TEAM_CROSS_WINDOW = 3;

export interface RivalGroup {
  members: string[];
  lastFlipAt: number | null;
}

export interface RivalryState {
  enabled: boolean;
  gameSessionId: number | null;
  groups: RivalGroup[];
  ahead: Record<string, boolean>;
  waiting: string[];
  lastRival: Record<string, string>;
  abilities: Record<string, number>;
  teamOf: Record<string, number>;
  withBots: boolean;
}

type RoomSeat = { avatar?: RivalAvatar; isBot?: boolean; isHost?: boolean; isPractice?: boolean } | undefined;

export interface RivalRoom {
  users: Record<string, RoomSeat>;
  playerScores: Record<string, number>;
  gameSessionId?: number | null;
  rivalry?: RivalryState | null;
}

export type RivalEmit =
  | { kind: 'private'; username: string; event: typeof RIVAL_EVENTS.update; payload: RivalUpdatePayload }
  | { kind: 'room'; event: typeof RIVAL_EVENTS.flip; payload: RivalFlipPayload };

export interface RivalRoundInput {
  enabled: boolean | undefined;
  leaderboardHidden?: boolean;
  mode: string;
  seed: string;
  abilities: Record<string, number>;
  teams?: Array<{ id: number; memberNames: string[] }>;
}

const abilityOf = (abilities: Record<string, number>, name: string) => abilities[name.toLowerCase()] ?? 0;

function hashOf(seed: string, name: string): number {
  let h = 2166136261;
  const s = `${seed}|${name.toLowerCase()}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const differentTeams = (teamOf: Record<string, number> | undefined, a: string, b: string) =>
  !!teamOf && teamOf[a] !== undefined && teamOf[b] !== undefined && teamOf[a] !== teamOf[b];

export function pairRivals(
  players: string[],
  abilities: Record<string, number>,
  opts: { seed: string; teamOf?: Record<string, number> }
): string[][] {
  const ranked = [...new Set(players)].sort((a, b) =>
    abilityOf(abilities, b) - abilityOf(abilities, a)
    || hashOf(opts.seed, a) - hashOf(opts.seed, b)
    || a.localeCompare(b));
  if (ranked.length < 2) return [];
  const paired = new Set<string>();
  const groups: string[][] = [];
  for (let i = 0; i < ranked.length; i++) {
    const me = ranked[i];
    if (paired.has(me)) continue;
    const open = ranked.slice(i + 1).filter((name) => !paired.has(name));
    if (open.length === 0) {
      groups[groups.length - 1].push(me);
      break;
    }
    const partner = open.slice(0, TEAM_CROSS_WINDOW).find((name) => differentTeams(opts.teamOf, me, name)) ?? open[0];
    paired.add(me).add(partner);
    groups.push([me, partner]);
  }
  return groups;
}

const isRealStudent = (room: RivalRoom, name: string) => {
  const seat = room.users[name];
  return !!seat && !seat.isBot && !seat.isHost && !seat.isPractice;
};

// A real class never duels a bot; a teacher previewing alone needs bots (and their practice seat) to see a duel at all.
function previewWithBots(room: RivalRoom): boolean {
  const seats = Object.keys(room.users);
  return seats.filter((name) => isRealStudent(room, name)).length < 2 && seats.some((name) => !!room.users[name]?.isBot);
}

const isEligible = (room: RivalRoom, name: string, withBots: boolean) => {
  if (isRealStudent(room, name)) return true;
  const seat = room.users[name];
  return withBots && !!seat && !seat.isHost && (!!seat.isBot || !!seat.isPractice);
};

const scoreOf = (room: RivalRoom, name: string) => room.playerScores?.[name] ?? 0;

const groupOf = (state: RivalryState, name: string) => state.groups.find((g) => g.members.includes(name));

const rivalIn = (group: RivalGroup, name: string) => {
  const i = group.members.indexOf(name);
  return group.members[(i + 1) % group.members.length];
};

function viewFor(room: RivalRoom, state: RivalryState, name: string): RivalView | null {
  const group = groupOf(state, name);
  if (!group) return null;
  const rival = rivalIn(group, name);
  return {
    rivalName: rival,
    rivalAvatar: room.users[rival]?.avatar ?? null,
    myScore: scoreOf(room, name),
    rivalScore: scoreOf(room, rival),
  };
}

function updateFor(room: RivalRoom, state: RivalryState, name: string, tookLead = false): RivalEmit {
  return {
    kind: 'private',
    username: name,
    event: RIVAL_EVENTS.update,
    payload: { gameSessionId: state.gameSessionId, rival: viewFor(room, state, name), ...(tookLead ? { tookLead: true } : {}) },
  };
}

function settleLeads(room: RivalRoom, state: RivalryState, group: RivalGroup): void {
  for (const name of group.members) state.ahead[name] = scoreOf(room, name) > scoreOf(room, rivalIn(group, name));
}

const liveState = (room: RivalRoom) => (room.rivalry?.enabled ? room.rivalry : null);

export function resetRivalsForNewRound(room: RivalRoom, input: RivalRoundInput): RivalEmit[] {
  const enabled = input.enabled !== false && !input.leaderboardHidden && !RIVALRY_OFF_MODES.has(input.mode);
  const teamOf: Record<string, number> = {};
  for (const team of input.teams ?? []) for (const name of team.memberNames) teamOf[name] = team.id;
  const withBots = enabled && previewWithBots(room);
  const eligible = enabled ? Object.keys(room.users).filter((name) => isEligible(room, name, withBots)) : [];
  const groups = pairRivals(eligible, input.abilities, { seed: input.seed, teamOf });
  const state: RivalryState = {
    enabled,
    gameSessionId: room.gameSessionId ?? null,
    groups: groups.map((members) => ({ members, lastFlipAt: null })),
    ahead: {},
    waiting: groups.length === 0 ? eligible : [],
    lastRival: {},
    abilities: { ...input.abilities },
    teamOf,
    withBots,
  };
  room.rivalry = state;
  return state.groups.flatMap((g) => g.members.map((name) => updateFor(room, state, name)));
}

export function rivalStartExtras(room: RivalRoom, username: string): RivalView | null {
  const state = liveState(room);
  return state ? viewFor(room, state, username) : null;
}

export function onScoreChanged(room: RivalRoom, username: string, now: number = Date.now()): RivalEmit[] {
  const state = liveState(room);
  const group = state && groupOf(state, username);
  if (!state || !group) return [];
  const tookLead = new Set<string>();
  const flipCandidates: string[] = [];
  for (const name of group.members) {
    const rival = rivalIn(group, name);
    const aheadNow = scoreOf(room, name) > scoreOf(room, rival);
    if (aheadNow && !state.ahead[name]) {
      tookLead.add(name);
      if (scoreOf(room, rival) > 0) flipCandidates.push(name);
    }
    state.ahead[name] = aheadNow;
  }
  const events = group.members.map((name) => updateFor(room, state, name, tookLead.has(name)));
  const cooled = group.lastFlipAt === null || now - group.lastFlipAt >= RIVAL_FLIP_COOLDOWN_MS;
  if (flipCandidates.length > 0 && cooled) {
    const winner = flipCandidates[0];
    group.lastFlipAt = now;
    events.push({
      kind: 'room',
      event: RIVAL_EVENTS.flip,
      payload: { gameSessionId: state.gameSessionId, winnerName: winner, winnerAvatar: room.users[winner]?.avatar ?? null },
    });
  }
  return events;
}

function closeness(state: RivalryState, a: string, b: string): [number, number] {
  const sameTeam = state.teamOf[a] !== undefined && state.teamOf[a] === state.teamOf[b] ? 1 : 0;
  return [sameTeam, Math.abs(abilityOf(state.abilities, a) - abilityOf(state.abilities, b))];
}

function closest(state: RivalryState, name: string, candidates: string[]): string | undefined {
  return [...candidates].sort((a, b) => {
    const [ta, da] = closeness(state, name, a);
    const [tb, db] = closeness(state, name, b);
    return ta - tb || da - db || a.localeCompare(b);
  })[0];
}

function newPair(room: RivalRoom, state: RivalryState, a: string, b: string): RivalEmit[] {
  const group: RivalGroup = { members: [a, b], lastFlipAt: null };
  state.groups.push(group);
  settleLeads(room, state, group);
  return [updateFor(room, state, a), updateFor(room, state, b)];
}

function place(room: RivalRoom, state: RivalryState, name: string): RivalEmit[] {
  const waitingPartner = closest(state, name, state.waiting.filter((w) => w !== name));
  if (waitingPartner) {
    state.waiting = state.waiting.filter((w) => w !== waitingPartner && w !== name);
    return newPair(room, state, waitingPartner, name);
  }
  const pairMember = closest(state, name, state.groups.filter((g) => g.members.length === 2).flatMap((g) => g.members));
  if (pairMember) {
    const group = groupOf(state, pairMember)!;
    group.members.push(name);
    settleLeads(room, state, group);
    return group.members.map((member) => updateFor(room, state, member));
  }
  const trioMember = closest(state, name, state.groups.flatMap((g) => g.members));
  if (trioMember) {
    const trio = groupOf(state, trioMember)!;
    trio.members = trio.members.filter((m) => m !== trioMember);
    settleLeads(room, state, trio);
    return [...trio.members.map((member) => updateFor(room, state, member)), ...newPair(room, state, trioMember, name)];
  }
  if (!state.waiting.includes(name)) state.waiting.push(name);
  return [updateFor(room, state, name)];
}

export function onPlayerLeft(room: RivalRoom, username: string): RivalEmit[] {
  const state = liveState(room);
  if (!state) return [];
  state.waiting = state.waiting.filter((w) => w !== username);
  const group = groupOf(state, username);
  if (!group) return [];
  state.lastRival[username] = rivalIn(group, username);
  group.members = group.members.filter((m) => m !== username);
  delete state.ahead[username];
  if (group.members.length >= 2) {
    settleLeads(room, state, group);
    return group.members.map((member) => updateFor(room, state, member));
  }
  state.groups = state.groups.filter((g) => g !== group);
  return place(room, state, group.members[0]);
}

export function seatRivalPlayer(room: RivalRoom, username: string): RivalEmit[] {
  const state = liveState(room);
  if (!state || !isEligible(room, username, state.withBots) || groupOf(state, username) || state.waiting.includes(username)) return [];
  const old = state.lastRival[username];
  delete state.lastRival[username];
  if (old && state.waiting.includes(old)) {
    state.waiting = state.waiting.filter((w) => w !== old);
    return newPair(room, state, old, username);
  }
  return place(room, state, username);
}
