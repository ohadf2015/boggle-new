/**
 * Party bots — solo-play fill players.
 *
 * Bots are dumb on purpose: one pure `decide(state, botId) -> action | null`
 * per game, plus a polling driver (see runPartyBotTick / startPartyBotDriver)
 * that submits the chosen action through the SAME engine functions a human's
 * input would hit. No engine fork, no AI, no difficulty tiers.
 *
 * Design notes:
 *  - Bots have synthetic `bot_*` socketIds and never own a real socket. Every
 *    engine emit uses `io.to(id)` which no-ops for missing sockets, so bots can
 *    safely call any submit fn.
 *  - Pixel solo runs in SHOWDOWN mode (canvases/votes keyed by socketId) — the
 *    only pixel mode a bot can play correctly without the emitted telephone
 *    chain assignments.
 *  - Shadow always seeds 2 shadows, so 3–5 players let evil win on night 1.
 *    Solo therefore fills shadow to 6 players for a real multi-round game.
 */

import type { Server } from 'socket.io';
import { getCaptionGameState, submitCaption, submitVote as submitCaptionVote } from './captionClashEngine';
import {
  getPixelGameState,
  submitShowdownCanvas,
  submitShowdownVote,
  submitTelephoneStep,
  submitRelayArtistDrawing,
  submitRelayBuilderDrawing,
} from './pixelClashEngine';
import { getShadowGameState, submitNightAction, submitVote as submitShadowVote } from './shadowClashEngine';

// Defined locally (backend tsconfig rootDir excludes shared/, matching partyHandler.ts).
type PartyGameId = 'caption-clash' | 'pixel-clash' | 'shadow-clash';

export type BotAction =
  | { kind: 'caption'; text: string }
  | { kind: 'caption-vote'; submissionId: string }
  | { kind: 'pixel-showdown-draw'; strokes: unknown[] }
  | { kind: 'pixel-showdown-vote'; best: string; funniest: string }
  | { kind: 'pixel-telephone-step'; chainId: string; content: unknown }
  | { kind: 'pixel-relay-artist'; strokes: unknown[] }
  | { kind: 'pixel-relay-builder'; strokes: unknown[] }
  | { kind: 'shadow-night'; targetUsername: string }
  | { kind: 'shadow-vote'; targetUsername: string };

// ---- Deterministic pick (no Math.random — keeps tests stable + spreads picks) ----
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick<T>(arr: T[], seed: string): T {
  return arr[hashString(seed) % arr.length];
}

// ---- Canned content ----
const CAPTIONS = [
  'When the deadline meets reality.',
  'Me pretending I understand.',
  'This is fine. Everything is fine.',
  'POV: it is Monday again.',
  'Nobody: … Absolutely nobody: … Me:',
  'The face of pure chaos.',
  'Certified menace behaviour.',
  'It went exactly as planned (it did not).',
  'Main character energy, zero plot.',
  'Trust me, I am an expert.',
];
// ---- Solo fill targets (total players incl. the human) ----
export const SOLO_FILL_TARGET: Record<PartyGameId, number> = {
  'caption-clash': 4,
  'pixel-clash': 4,
  'shadow-clash': 6,
};

const BOT_NAMES = [
  'Bitsy', 'Nova', 'Pixel', 'Gizmo', 'Echo', 'Mochi', 'Zap', 'Quibble', 'Waffle', 'Sprocket',
];

export interface BotPlayer {
  socketId: string;
  username: string;
  isHost: false;
  isBot: true;
}

let botSeq = 0;
/** Build N bot players with unique synthetic ids. */
export function makeBotPlayers(count: number): BotPlayer[] {
  const bots: BotPlayer[] = [];
  for (let i = 0; i < count; i++) {
    botSeq += 1;
    bots.push({
      socketId: `bot_${botSeq}_${hashString(BOT_NAMES[i % BOT_NAMES.length] + botSeq).toString(36)}`,
      username: BOT_NAMES[i % BOT_NAMES.length],
      isHost: false,
      isBot: true,
    });
  }
  return bots;
}

// ==================== Caption ====================

interface CaptionRoundLike {
  phase: string;
  submissions: Map<string, { id: string; socketId: string }>;
  votes: Map<string, string>;
}
interface CaptionStateLike {
  rounds: CaptionRoundLike[];
}

export function decideCaptionBotAction(game: CaptionStateLike, botId: string): BotAction | null {
  const round = game.rounds[game.rounds.length - 1];
  if (!round) return null;

  if (round.phase === 'writing' || round.phase === 'speed-writing') {
    const already = [...round.submissions.values()].some((s) => s.socketId === botId);
    if (already) return null;
    return { kind: 'caption', text: pick(CAPTIONS, botId + round.submissions.size) };
  }

  if (round.phase === 'voting') {
    if (round.votes.has(botId)) return null;
    const choices = [...round.submissions.values()].filter((s) => s.socketId !== botId);
    if (choices.length === 0) return null;
    return { kind: 'caption-vote', submissionId: pick(choices, botId).id };
  }

  return null;
}

// ==================== Pixel (showdown) ====================

interface PixelChainLike {
  id: string;
  steps: { playerId: string }[];
}
interface PixelRelayLike {
  artistId: string;
  originalDrawing: unknown[];
  builderDrawings: Map<string, unknown>;
}
interface PixelRoundLike {
  phase: string;
  canvases?: Map<string, unknown>;
  votes?: Map<string, unknown>;
  chains?: PixelChainLike[];
  currentStepIndex?: number;
  relay?: PixelRelayLike;
}
interface PixelStateLike {
  playerOrder: string[];
  rounds: PixelRoundLike[];
}

const GUESSES = ['cat', 'house', 'rocket', 'pizza', 'robot', 'banana', 'ghost', 'dragon', 'tree', 'star'];

export function decidePixelBotAction(game: PixelStateLike, botId: string): BotAction | null {
  const round = game.rounds[game.rounds.length - 1];
  if (!round) return null;

  // ---- Showdown ----
  if (round.phase === 'showdown-draw') {
    if (round.canvases?.has(botId)) return null;
    return { kind: 'pixel-showdown-draw', strokes: stubStrokes(botId) };
  }
  if (round.phase === 'showdown-vote') {
    if (round.votes?.has(botId)) return null;
    const others = game.playerOrder.filter((id) => id !== botId);
    if (others.length === 0) return null;
    return { kind: 'pixel-showdown-vote', best: pick(others, botId + 'best'), funniest: pick(others, botId + 'funny') };
  }

  // ---- Telephone (chain assignment reconstructed from playerOrder + step) ----
  if ((round.phase === 'drawing' || round.phase === 'guessing') && round.chains) {
    const i = game.playerOrder.indexOf(botId);
    if (i < 0) return null;
    const step = round.currentStepIndex ?? 1;
    // Step 1 draws your OWN chain (engine seeds it); later steps rotate by (i+step).
    const chainIdx = step === 1 ? i : (i + step) % round.chains.length;
    const chain = round.chains[chainIdx];
    if (!chain) return null;
    if (chain.steps.length > step) return null; // already added this step
    const isDraw = step % 2 === 1;
    return {
      kind: 'pixel-telephone-step',
      chainId: chain.id,
      content: isDraw ? stubStrokes(botId + step) : pick(GUESSES, botId + step),
    };
  }

  // ---- Relay ----
  if (round.phase === 'relay-artist' && round.relay) {
    if (round.relay.artistId !== botId) return null; // only the artist draws
    if ((round.relay.originalDrawing?.length ?? 0) > 0) return null; // already drew
    return { kind: 'pixel-relay-artist', strokes: stubStrokes(botId + 'artist') };
  }
  if (round.phase === 'relay-build' && round.relay) {
    if (round.relay.artistId === botId) return null; // artist doesn't build
    if (round.relay.builderDrawings.has(botId)) return null;
    return { kind: 'pixel-relay-builder', strokes: stubStrokes(botId + 'build') };
  }

  return null;
}

/** A small deterministic doodle so the canvas isn't blank. */
function stubStrokes(seed: string): unknown[] {
  const h = hashString(seed);
  const cx = 40 + (h % 120);
  const cy = 40 + ((h >> 3) % 120);
  return [
    {
      paths: [
        { x: cx, y: cy },
        { x: cx + 60, y: cy + 20 },
        { x: cx + 20, y: cy + 70 },
        { x: cx, y: cy },
      ],
      strokeColor: '#1a1a2e',
      strokeWidth: 6,
    },
  ];
}

// ==================== Shadow ====================

interface ShadowStateLike {
  phase: string;
  roles: Map<string, string>;
  alivePlayers: Set<string>;
  playerUsernames: Map<string, string>;
  nightActions: { shadowVotes: Map<string, string>; seerTarget: string | null; medicTarget: string | null };
  votes: Map<string, string>;
}

export function decideShadowBotAction(game: ShadowStateLike, botId: string): BotAction | null {
  if (!game.alivePlayers.has(botId)) return null;
  const myName = game.playerUsernames.get(botId);
  const aliveNames = [...game.alivePlayers]
    .map((id) => game.playerUsernames.get(id))
    .filter((n): n is string => Boolean(n));
  const targets = aliveNames.filter((n) => n !== myName);

  if (game.phase === 'night') {
    const role = game.roles.get(botId);
    if (role === 'shadow') {
      if (game.nightActions.shadowVotes.has(botId)) return null;
      if (targets.length === 0) return null;
      return { kind: 'shadow-night', targetUsername: pick(targets, botId) };
    }
    if (role === 'seer') {
      if (game.nightActions.seerTarget !== null) return null;
      if (targets.length === 0) return null;
      return { kind: 'shadow-night', targetUsername: pick(targets, botId) };
    }
    if (role === 'medic') {
      if (game.nightActions.medicTarget !== null) return null;
      // Medic may protect anyone alive (incl. self).
      return { kind: 'shadow-night', targetUsername: pick(aliveNames, botId) };
    }
    return null; // citizen: no night action
  }

  if (game.phase === 'trial') {
    if (game.votes.has(botId)) return null;
    if (targets.length === 0) return { kind: 'shadow-vote', targetUsername: 'skip' };
    // Bots lynch live, sometimes skip — deterministic per bot.
    const ballot = [...targets, 'skip'];
    return { kind: 'shadow-vote', targetUsername: pick(ballot, botId + game.votes.size) };
  }

  return null;
}

// ==================== Driver ====================

/**
 * Run one bot tick: for each eligible bot, decide an action from live engine
 * state and submit it through the real engine fn. Returns true when the game is
 * over (caller should stop the driver). Delay-free — the interval in
 * startPartyBotDriver decides which bots are "eligible" this tick.
 */
export function runPartyBotTick(
  io: Server,
  roomCode: string,
  gameId: PartyGameId,
  botIds: string[],
): boolean {
  if (gameId === 'caption-clash') {
    const game = getCaptionGameState(roomCode);
    if (!game) return true;
    if (game.currentRound >= game.totalRounds) {
      const last = game.rounds[game.rounds.length - 1];
      if (last && last.phase === 'crown') return true;
    }
    for (const botId of botIds) {
      const action = decideCaptionBotAction(game as unknown as CaptionStateLike, botId);
      if (!action) continue;
      if (action.kind === 'caption') submitCaption(io, roomCode, botId, action.text);
      else if (action.kind === 'caption-vote') submitCaptionVote(io, roomCode, botId, action.submissionId);
    }
    return false;
  }

  if (gameId === 'pixel-clash') {
    const game = getPixelGameState(roomCode);
    if (!game) return true;
    for (const botId of botIds) {
      const action = decidePixelBotAction(game as unknown as PixelStateLike, botId);
      if (!action) continue;
      if (action.kind === 'pixel-showdown-draw') submitShowdownCanvas(io, roomCode, botId, action.strokes as never);
      else if (action.kind === 'pixel-showdown-vote') submitShowdownVote(roomCode, botId, action.best, action.funniest);
      else if (action.kind === 'pixel-telephone-step') submitTelephoneStep(io, roomCode, botId, action.chainId, action.content as never);
      else if (action.kind === 'pixel-relay-artist') submitRelayArtistDrawing(io, roomCode, botId, action.strokes as never);
      else if (action.kind === 'pixel-relay-builder') submitRelayBuilderDrawing(io, roomCode, botId, action.strokes as never);
    }
    return false;
  }

  if (gameId === 'shadow-clash') {
    const game = getShadowGameState(roomCode);
    if (!game) return true;
    if (game.phase === 'game-over') return true;
    for (const botId of botIds) {
      const action = decideShadowBotAction(game as unknown as ShadowStateLike, botId);
      if (!action) continue;
      if (action.kind === 'shadow-night') submitNightAction(io, roomCode, botId, action.targetUsername);
      else if (action.kind === 'shadow-vote') submitShadowVote(io, roomCode, botId, action.targetUsername);
    }
    return false;
  }

  return false;
}

/** A coarse signature of the current phase so the driver can reset per-phase timing. */
function phaseSignature(gameId: PartyGameId, roomCode: string): string | null {
  if (gameId === 'caption-clash') {
    const g = getCaptionGameState(roomCode);
    if (!g) return null;
    return `${g.currentRound}:${g.rounds[g.rounds.length - 1]?.phase ?? '?'}`;
  }
  if (gameId === 'pixel-clash') {
    const g = getPixelGameState(roomCode);
    if (!g) return null;
    return `${g.currentRound}:${g.rounds[g.rounds.length - 1]?.phase ?? '?'}`;
  }
  const g = getShadowGameState(roomCode);
  if (!g) return null;
  return `${g.round}:${g.phase}`;
}

const TICK_MS = 1200;
// Bots "think" before acting so a prompt human isn't outrun (esp. caption voting,
// which early-advances at size-1). Window: BASE..BASE+SPREAD ms into each phase.
const THINK_BASE_MS = 2500;
const THINK_SPREAD_MS = 3500;

interface DriverState {
  interval: ReturnType<typeof setInterval>;
}
const drivers = new Map<string, DriverState>();

/**
 * Start the polling bot driver for a solo room. Bots act, staggered, on a short
 * delay after each phase change, then self-stop when the game ends (invoking
 * onStop, e.g. to evict the bots from the room).
 */
export function startPartyBotDriver(
  io: Server,
  roomCode: string,
  gameId: PartyGameId,
  botIds: string[],
  clock: () => number,
  onStop?: () => void,
): void {
  stopPartyBotDriver(roomCode);

  let currentPhase = '';
  let phaseSeenAt = 0;
  const actedThisPhase = new Set<string>();

  const interval = setInterval(() => {
    const sig = phaseSignature(gameId, roomCode);
    if (sig === null) {
      stopPartyBotDriver(roomCode);
      onStop?.();
      return;
    }
    const now = clock();
    if (sig !== currentPhase) {
      currentPhase = sig;
      phaseSeenAt = now;
      actedThisPhase.clear();
    }
    const elapsed = now - phaseSeenAt;
    const eligible = botIds.filter((id) => {
      if (actedThisPhase.has(id)) return false;
      const delay = THINK_BASE_MS + (hashString(id + currentPhase) % THINK_SPREAD_MS);
      return elapsed >= delay;
    });
    if (eligible.length > 0) {
      eligible.forEach((id) => actedThisPhase.add(id));
      const over = runPartyBotTick(io, roomCode, gameId, eligible);
      if (over) {
        stopPartyBotDriver(roomCode);
        onStop?.();
      }
    }
  }, TICK_MS);
  if (typeof interval.unref === 'function') interval.unref();
  drivers.set(roomCode, { interval });
}

export function stopPartyBotDriver(roomCode: string): void {
  const d = drivers.get(roomCode);
  if (d) {
    clearInterval(d.interval);
    drivers.delete(roomCode);
  }
}

/** Test/diagnostic helper. */
export function isBotDriverRunning(roomCode: string): boolean {
  return drivers.has(roomCode);
}
