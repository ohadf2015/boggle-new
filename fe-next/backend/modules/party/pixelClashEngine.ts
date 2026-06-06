/**
 * Pixel Clash Game Engine (Scribble Mode)
 * Manages 3 modes: Telephone, Showdown, Pixel Relay
 * Uses freehand stroke data (CanvasPath[]) instead of pixel grids.
 */

import type { Server } from 'socket.io';
import logger from '../../utils/logger.js';

// ==================== Types ====================

/** CanvasPath from react-sketch-canvas — serialized over the wire */
export interface CanvasPath {
  paths: Array<{ x: number; y: number }>;
  strokeWidth: number;
  strokeColor: string;
  drawMode: boolean;
  startTimestamp?: number;
  endTimestamp?: number;
}

export type DrawingData = CanvasPath[];
type PixelMode = 'telephone' | 'showdown' | 'relay';

interface TelephoneStep {
  playerId: string;
  username: string;
  type: 'write' | 'draw';
  content: string | DrawingData;
  timestamp: number;
}

interface TelephoneChain {
  id: string;
  originPlayer: string;
  steps: TelephoneStep[];
}

interface PixelRound {
  mode: PixelMode;
  phase: string;
  prompt: string;
  // Telephone
  chains?: TelephoneChain[];
  currentStepIndex?: number;
  // Showdown
  canvases?: Map<string, DrawingData>;
  votes?: Map<string, { best: string; funniest: string }>;
  // Relay
  relay?: RelayState;
  timer: ReturnType<typeof setTimeout> | null;
}

interface RelayState {
  artistId: string;
  artistUsername: string;
  originalDrawing: DrawingData;
  prompt: string;
  builderDrawings: Map<string, DrawingData>;
}

interface PixelGameState {
  rounds: PixelRound[];
  currentRound: number;
  totalRounds: number;
  mode: PixelMode;
  /** Solo: rotate telephone → showdown → relay per round so all modes are testable. */
  rotateModes: boolean;
  scores: Map<string, number>;
  playerUsernames: Map<string, string>;
  playerOrder: string[];
}

const PIXEL_MODE_ROTATION: PixelMode[] = ['showdown', 'telephone', 'relay'];

// ==================== Prompt Database ====================

const DRAW_PROMPTS = [
  'cat', 'house', 'pizza', 'robot', 'tree', 'car', 'sun', 'fish',
  'rocket', 'flower', 'dog', 'mountain', 'boat', 'crown', 'star',
  'heart', 'bird', 'castle', 'dragon', 'ghost', 'alien', 'cake',
  'umbrella', 'rainbow', 'moon', 'snowman', 'spider', 'sword',
  'guitar', 'hat', 'key', 'mushroom', 'skull', 'trophy', 'whale',
  'butterfly', 'tornado', 'volcano', 'diamond', 'eye', 'flame',
  'clock', 'lighthouse', 'anchor', 'balloon', 'camera', 'unicorn',
  'cactus', 'penguin', 'octopus', 'hamburger', 'ice cream', 'dinosaur',
  'helicopter', 'palm tree', 'pirate ship', 'treasure chest', 'campfire',
  'waterfall', 'sunset', 'bicycle', 'elephant', 'panda', 'sushi',
];

// ==================== State ====================

const activeGames = new Map<string, PixelGameState>();
// Track delayed cleanup timers (endPixelClash schedules a 60s delayed delete)
const delayedCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ==================== Helpers ====================

function pickPrompt(usedPrompts: string[]): string {
  const available = DRAW_PROMPTS.filter(p => !usedPrompts.includes(p));
  const pool = available.length > 0 ? available : DRAW_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ==================== Public API ====================

export function initPixelClash(
  roomCode: string,
  players: Map<string, string>,
  mode: PixelMode,
  totalRounds: number,
  rotateModes = false,
): void {
  const state: PixelGameState = {
    rounds: [],
    currentRound: 0,
    totalRounds,
    mode,
    rotateModes,
    scores: new Map(),
    playerUsernames: players,
    playerOrder: Array.from(players.keys()),
  };
  for (const id of players.keys()) state.scores.set(id, 0);
  activeGames.set(roomCode, state);
  logger.info('PARTY', `Pixel Clash initialized: ${roomCode}, mode=${mode}, ${players.size} players`);
}

export function startPixelRound(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.currentRound++;
  // Solo rotates modes per round so the admin can playtest all three.
  if (game.rotateModes) {
    game.mode = PIXEL_MODE_ROTATION[(game.currentRound - 1) % PIXEL_MODE_ROTATION.length];
  }
  const usedPrompts = game.rounds.map(r => r.prompt);
  const prompt = pickPrompt(usedPrompts);

  if (game.mode === 'relay') {
    startRelayRound(io, roomCode, game, prompt);
  } else if (game.mode === 'showdown') {
    startShowdownRound(io, roomCode, game, prompt);
  } else {
    startTelephoneRound(io, roomCode, game, prompt);
  }
}

// ==================== Telephone Mode ====================
// Flow: random prompt → draw → guess → draw → guess → ... → gallery reveal
// Each player starts a chain with a random word from DRAW_PROMPTS.
// Chains rotate between players each step.

function startTelephoneRound(io: Server, roomCode: string, game: PixelGameState, _prompt: string): void {
  const usedPrompts = game.rounds.flatMap(r => (r.chains || []).map(c => c.steps[0]?.content as string)).filter(Boolean);

  // Create one chain per player, each with a random prompt
  const chains: TelephoneChain[] = game.playerOrder.map((playerId) => {
    const prompt = pickPrompt(usedPrompts);
    usedPrompts.push(prompt); // avoid dupes within the round
    const username = game.playerUsernames.get(playerId) || 'Unknown';
    return {
      id: `chain_${playerId}`,
      originPlayer: playerId,
      steps: [{ playerId, username, type: 'write' as const, content: prompt, timestamp: Date.now() }],
    };
  });

  const round: PixelRound = {
    mode: 'telephone',
    phase: 'drawing', // Skip write-prompt, go straight to drawing
    prompt: '',
    chains,
    currentStepIndex: 1, // Step 0 was the auto-assigned prompt, step 1 = first draw
    timer: null,
  };

  game.rounds.push(round);

  // Assign each player their own chain's prompt to draw
  for (let i = 0; i < game.playerOrder.length; i++) {
    const playerId = game.playerOrder[i];
    const chain = chains[i];
    io.to(playerId).emit('party:pixel:assignment', {
      phase: 'drawing',
      content: chain.steps[0].content, // The text prompt
      chainId: chain.id,
      timeSeconds: 60,
    });
  }

  io.to(`party:${roomCode}`).emit('party:pixel:phaseUpdate', {
    mode: 'telephone',
    phase: 'drawing',
    round: game.currentRound,
    totalRounds: game.totalRounds,
    timeSeconds: 60,
  });

  round.timer = setTimeout(() => {
    advanceTelephoneStep(io, roomCode);
  }, 60000);
}

// Legacy: still accept manual prompts if someone sends one
export function submitTelephonePrompt(_io: Server, _roomCode: string, _socketId: string, _text: string): void {
  // No-op — prompts are now auto-assigned from DRAW_PROMPTS
}

function advanceTelephoneStep(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || !round.chains || round.chains.length === 0) {
    // Safety: if somehow no chains, advance to next round
    if (game.currentRound >= game.totalRounds) {
      endPixelClash(io, roomCode);
    } else {
      startPixelRound(io, roomCode);
    }
    return;
  }

  round.currentStepIndex = (round.currentStepIndex || 0) + 1;

  // Total steps = number of players (each player contributes once per chain)
  // With N players we get N steps: prompt, draw, guess, draw, guess...
  if (round.currentStepIndex >= game.playerOrder.length) {
    startTelephoneReveal(io, roomCode, game, round);
    return;
  }

  // Odd steps = drawing (from text), even steps = guessing (from drawing)
  const isDraw = round.currentStepIndex % 2 === 1;
  round.phase = isDraw ? 'drawing' : 'guessing';

  // Rotate chain assignments so each player sees a different chain
  const assignments: Array<{ playerId: string; chainId: string; content: string | DrawingData }> = [];
  for (let i = 0; i < game.playerOrder.length; i++) {
    const playerId = game.playerOrder[i];
    const chainIdx = (i + round.currentStepIndex) % round.chains.length;
    const chain = round.chains[chainIdx];
    if (!chain) continue;
    const lastStep = chain.steps[chain.steps.length - 1];
    assignments.push({ playerId, chainId: chain.id, content: lastStep.content });
  }

  for (const assignment of assignments) {
    io.to(assignment.playerId).emit('party:pixel:assignment', {
      phase: round.phase,
      content: assignment.content,
      chainId: assignment.chainId,
      timeSeconds: isDraw ? 60 : 30,
    });
  }

  io.to(`party:${roomCode}`).emit('party:pixel:phaseUpdate', {
    mode: 'telephone',
    phase: round.phase,
    round: game.currentRound,
    totalRounds: game.totalRounds,
    timeSeconds: isDraw ? 60 : 30,
  });

  round.timer = setTimeout(() => {
    advanceTelephoneStep(io, roomCode);
  }, isDraw ? 60000 : 30000);
}

export function submitTelephoneStep(io: Server, roomCode: string, socketId: string, chainId: string, content: string | DrawingData): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || !round.chains) return;

  const chain = round.chains.find(c => c.id === chainId);
  if (!chain) return;

  const username = game.playerUsernames.get(socketId) || 'Unknown';
  const isDraw = round.phase === 'drawing';
  chain.steps.push({
    playerId: socketId,
    username,
    type: isDraw ? 'draw' : 'write',
    content,
    timestamp: Date.now(),
  });

  const expectedSubmissions = game.playerOrder.length;
  const totalStepsThisRound = round.chains.reduce((sum, c) => {
    return sum + (c.steps.length > (round.currentStepIndex || 0) ? 1 : 0);
  }, 0);

  if (totalStepsThisRound >= expectedSubmissions) {
    if (round.timer) clearTimeout(round.timer);
    advanceTelephoneStep(io, roomCode);
  }
}

function startTelephoneReveal(io: Server, roomCode: string, game: PixelGameState, round: PixelRound): void {
  round.phase = 'gallery-reveal';
  if (round.timer) clearTimeout(round.timer);

  const chains = round.chains || [];
  chains.forEach((chain, index) => {
    setTimeout(() => {
      io.to(`party:${roomCode}`).emit('party:pixel:chainReveal', {
        chain,
        index,
        total: chains.length,
      });
    }, index * 8000);
  });

  round.timer = setTimeout(() => {
    if (game.currentRound >= game.totalRounds) {
      endPixelClash(io, roomCode);
    } else {
      startPixelRound(io, roomCode);
    }
  }, chains.length * 8000 + 3000);
}

// ==================== Showdown Mode ====================

function startShowdownRound(io: Server, roomCode: string, game: PixelGameState, prompt: string): void {
  const round: PixelRound = {
    mode: 'showdown',
    phase: 'showdown-draw',
    prompt,
    canvases: new Map(),
    votes: new Map(),
    timer: null,
  };

  game.rounds.push(round);

  io.to(`party:${roomCode}`).emit('party:pixel:phaseUpdate', {
    mode: 'showdown',
    phase: 'showdown-draw',
    prompt,
    round: game.currentRound,
    totalRounds: game.totalRounds,
    timeSeconds: 60,
  });

  round.timer = setTimeout(() => {
    advanceShowdownToVote(io, roomCode);
  }, 60000);
}

export function submitShowdownCanvas(io: Server, roomCode: string, socketId: string, strokes: DrawingData): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || round.phase !== 'showdown-draw' || !round.canvases) return;

  round.canvases.set(socketId, strokes);

  if (round.canvases.size >= game.playerOrder.length) {
    if (round.timer) clearTimeout(round.timer);
    advanceShowdownToVote(io, roomCode);
  }
}

function advanceShowdownToVote(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || !round.canvases) return;

  round.phase = 'showdown-vote';

  const entries = Array.from(round.canvases.entries())
    .sort(() => Math.random() - 0.5)
    .map(([socketId, strokes], index) => ({
      id: socketId,
      strokes,
      number: index + 1,
    }));

  io.to(`party:${roomCode}`).emit('party:pixel:showdownCanvases', {
    canvases: entries,
    prompt: round.prompt,
    timeSeconds: 20,
  });

  round.timer = setTimeout(() => {
    advanceShowdownToCrown(io, roomCode);
  }, 20000);
}

export function submitShowdownVote(roomCode: string, socketId: string, best: string, funniest: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || round.phase !== 'showdown-vote' || !round.votes) return;
  if (best === socketId || funniest === socketId) return;

  round.votes.set(socketId, { best, funniest });
}

function advanceShowdownToCrown(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || !round.votes || !round.canvases) return;

  round.phase = 'crown';
  if (round.timer) clearTimeout(round.timer);

  const bestCounts = new Map<string, number>();
  const funniestCounts = new Map<string, number>();
  for (const vote of round.votes.values()) {
    bestCounts.set(vote.best, (bestCounts.get(vote.best) || 0) + 1);
    funniestCounts.set(vote.funniest, (funniestCounts.get(vote.funniest) || 0) + 1);
  }

  let bestWinner = '', bestMax = 0;
  for (const [id, count] of bestCounts) {
    if (count > bestMax) { bestWinner = id; bestMax = count; }
  }

  let funniestWinner = '', funniestMax = 0;
  for (const [id, count] of funniestCounts) {
    if (count > funniestMax) { funniestWinner = id; funniestMax = count; }
  }

  if (bestWinner) game.scores.set(bestWinner, (game.scores.get(bestWinner) || 0) + 500);
  if (funniestWinner) game.scores.set(funniestWinner, (game.scores.get(funniestWinner) || 0) + 300);

  io.to(`party:${roomCode}`).emit('party:pixel:showdownResults', {
    bestWinner: { id: bestWinner, username: game.playerUsernames.get(bestWinner) || 'Unknown', votes: bestMax },
    funniestWinner: { id: funniestWinner, username: game.playerUsernames.get(funniestWinner) || 'Unknown', votes: funniestMax },
    canvases: Array.from(round.canvases.entries()).map(([id, strokes]) => ({
      id,
      username: game.playerUsernames.get(id) || 'Unknown',
      strokes,
    })),
    prompt: round.prompt,
  });

  round.timer = setTimeout(() => {
    if (game.currentRound >= game.totalRounds) {
      endPixelClash(io, roomCode);
    } else {
      startPixelRound(io, roomCode);
    }
  }, 8000);
}

// ==================== Relay Mode ====================

function startRelayRound(io: Server, roomCode: string, game: PixelGameState, prompt: string): void {
  const artistIdx = (game.currentRound - 1) % game.playerOrder.length;
  const artistId = game.playerOrder[artistIdx];
  const artistUsername = game.playerUsernames.get(artistId) || 'Unknown';

  const round: PixelRound = {
    mode: 'relay',
    phase: 'relay-artist',
    prompt,
    relay: {
      artistId,
      artistUsername,
      originalDrawing: [],
      prompt,
      builderDrawings: new Map(),
    },
    timer: null,
  };

  game.rounds.push(round);

  io.to(artistId).emit('party:pixel:relayArtistStart', {
    prompt,
    timeSeconds: 60,
  });

  io.to(`party:${roomCode}`).emit('party:pixel:phaseUpdate', {
    mode: 'relay',
    phase: 'relay-artist',
    artistUsername,
    round: game.currentRound,
    totalRounds: game.totalRounds,
    timeSeconds: 60,
  });

  round.timer = setTimeout(() => {
    startRelayBuild(io, roomCode);
  }, 60000);
}

/** Live stroke updates from artist — forward to TV */
export function handleRelayLiveStroke(io: Server, roomCode: string, socketId: string, paths: DrawingData): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay || round.relay.artistId !== socketId) return;

  round.relay.originalDrawing = paths;

  // Forward to TV for live display
  io.to(`party:${roomCode}`).emit('party:pixel:liveStroke', { paths });
}

export function submitRelayArtistDrawing(io: Server, roomCode: string, socketId: string, strokes: DrawingData): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay || round.relay.artistId !== socketId) return;

  round.relay.originalDrawing = strokes;
}

function startRelayBuild(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay) return;

  round.phase = 'relay-build';
  if (round.timer) clearTimeout(round.timer);

  const builders = game.playerOrder.filter(id => id !== round.relay!.artistId);

  // Send each builder the original drawing as reference (they'll try to replicate it)
  for (const builderId of builders) {
    io.to(builderId).emit('party:pixel:relayBuildStart', {
      referenceStrokes: round.relay.originalDrawing,
      timeSeconds: 30,
    });
  }

  io.to(`party:${roomCode}`).emit('party:pixel:phaseUpdate', {
    mode: 'relay',
    phase: 'relay-build',
    round: game.currentRound,
    totalRounds: game.totalRounds,
    timeSeconds: 30,
  });

  round.timer = setTimeout(() => {
    startRelayReveal(io, roomCode);
  }, 30000);
}

export function submitRelayBuilderDrawing(io: Server, roomCode: string, socketId: string, strokes: DrawingData): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay) return;

  round.relay.builderDrawings.set(socketId, strokes);

  // Broadcast live update to TV
  io.to(`party:${roomCode}`).emit('party:pixel:canvasUpdate', {
    playerId: socketId,
    strokes,
  });
}

function startRelayReveal(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay) return;

  round.phase = 'relay-merge';
  if (round.timer) clearTimeout(round.timer);

  // Pick the builder drawing with the most strokes as the "best attempt"
  let bestDrawing: DrawingData = [];
  let bestStrokeCount = 0;
  for (const drawing of round.relay.builderDrawings.values()) {
    if (drawing.length > bestStrokeCount) {
      bestDrawing = drawing;
      bestStrokeCount = drawing.length;
    }
  }

  // Simple scoring: builders get points for participating, bonus for more strokes
  const basePoints = 200;
  for (const [builderId, drawing] of round.relay.builderDrawings) {
    const bonus = Math.min(drawing.length * 20, 300);
    game.scores.set(builderId, (game.scores.get(builderId) || 0) + basePoints + bonus);
  }
  // Artist gets base points
  game.scores.set(round.relay.artistId, (game.scores.get(round.relay.artistId) || 0) + basePoints);

  io.to(`party:${roomCode}`).emit('party:pixel:mergeReveal', {
    merged: bestDrawing,
    original: round.relay.originalDrawing,
    prompt: round.relay.prompt,
    score: Math.min(100, Math.round((bestStrokeCount / Math.max(round.relay.originalDrawing.length, 1)) * 100)),
    artistUsername: round.relay.artistUsername,
    bands: Array.from(round.relay.builderDrawings.entries()).map(([id]) => ({
      builderUsername: game.playerUsernames.get(id) || 'Unknown',
    })),
  });

  round.timer = setTimeout(() => {
    if (game.currentRound >= game.totalRounds) {
      endPixelClash(io, roomCode);
    } else {
      startPixelRound(io, roomCode);
    }
  }, 10000);
}

// ==================== End Game ====================

function endPixelClash(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const finalScores = Array.from(game.scores.entries())
    .map(([socketId, score]) => ({
      socketId,
      username: game.playerUsernames.get(socketId) || 'Unknown',
      score,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  io.to(`party:${roomCode}`).emit('party:gameResults', {
    gameId: 'pixel-clash',
    finalScores,
    roundResults: [],
    mvp: finalScores[0]?.username,
  });

  io.to(`party:${roomCode}`).emit('party:phaseChange', {
    phase: 'results',
    gameState: null,
  });

  const delayTimer = setTimeout(() => {
    activeGames.delete(roomCode);
    delayedCleanupTimers.delete(roomCode);
  }, 60000);
  delayedCleanupTimers.set(roomCode, delayTimer);
  logger.info('PARTY', `Pixel Clash ended in ${roomCode}. Winner: ${finalScores[0]?.username}`);
}

export function cleanupPixelClash(roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (game) {
    for (const round of game.rounds) {
      if (round.timer) clearTimeout(round.timer);
    }
  }
  // Clear delayed cleanup timer from endPixelClash if still pending
  const delayTimer = delayedCleanupTimers.get(roomCode);
  if (delayTimer) {
    clearTimeout(delayTimer);
    delayedCleanupTimers.delete(roomCode);
  }
  activeGames.delete(roomCode);
}

/** Read-only accessor for the live game state (used by the solo bot driver). */
export function getPixelGameState(roomCode: string): PixelGameState | undefined {
  return activeGames.get(roomCode);
}

/**
 * Replay the current showdown phase to ONE socket (state-on-demand).
 * Fixes the mount-timing stall: phaseUpdate/showdownCanvases are one-shot
 * broadcasts, so a phone that mounts on the transition (or a late joiner)
 * misses them and sits on "Starting...". The client requests state on mount.
 * (Showdown is the only pixel mode solo uses; telephone/relay rely on
 * per-step assignments and are out of scope here.)
 */
export function resendPixelState(io: Server, roomCode: string, socketId: string): void {
  const game = activeGames.get(roomCode);
  if (!game || game.mode !== 'showdown') return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round) return;

  if (round.phase === 'showdown-draw') {
    io.to(socketId).emit('party:pixel:phaseUpdate', {
      mode: 'showdown',
      phase: 'showdown-draw',
      prompt: round.prompt,
      round: game.currentRound,
      totalRounds: game.totalRounds,
      timeSeconds: 60,
    });
  } else if (round.phase === 'showdown-vote' && round.canvases) {
    // Re-shuffles canvas order (cosmetic; votes are keyed by socketId).
    const entries = Array.from(round.canvases.entries())
      .sort(() => Math.random() - 0.5)
      .map(([id, strokes], index) => ({ id, strokes, number: index + 1 }));
    io.to(socketId).emit('party:pixel:showdownCanvases', {
      canvases: entries,
      prompt: round.prompt,
      timeSeconds: 20,
    });
  }
}
