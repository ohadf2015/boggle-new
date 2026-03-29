/**
 * Pixel Clash Game Engine
 * Manages 3 modes: Telephone, Showdown, Pixel Relay
 */

import type { Server } from 'socket.io';
import logger from '../../utils/logger.js';

// ==================== Types ====================

type PixelColor = number; // 0-7, 0 = empty
type PixelGrid = PixelColor[][];
type PixelMode = 'telephone' | 'showdown' | 'relay';

interface TelephoneStep {
  playerId: string;
  username: string;
  type: 'write' | 'draw';
  content: string | PixelGrid;
  timestamp: number;
}

interface TelephoneChain {
  id: string;
  originPlayer: string;
  steps: TelephoneStep[];
}

interface RelayBand {
  builderId: string;
  builderUsername: string;
  startRow: number;
  endRow: number;
  canvas: PixelGrid;
}

interface RelayState {
  artistId: string;
  artistUsername: string;
  originalCanvas: PixelGrid;
  prompt: string;
  bands: RelayBand[];
  pixelationLevel: number; // 0=max blur, 3=clear
  mergedCanvas: PixelGrid | null;
  similarityScore: number;
}

interface PixelRound {
  mode: PixelMode;
  phase: string;
  prompt: string;
  gridSize: number;
  // Telephone
  chains?: TelephoneChain[];
  currentStepIndex?: number;
  // Showdown
  canvases?: Map<string, PixelGrid>;
  votes?: Map<string, { best: string; funniest: string }>;
  // Relay
  relay?: RelayState;
  timer: ReturnType<typeof setTimeout> | null;
}

interface PixelGameState {
  rounds: PixelRound[];
  currentRound: number;
  totalRounds: number;
  mode: PixelMode;
  scores: Map<string, number>;
  playerUsernames: Map<string, string>;
  playerOrder: string[]; // socket IDs in order
  gridSize: number;
}

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

// ==================== Helpers ====================

function createEmptyGrid(size: number): PixelGrid {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function pickPrompt(usedPrompts: string[]): string {
  const available = DRAW_PROMPTS.filter(p => !usedPrompts.includes(p));
  const pool = available.length > 0 ? available : DRAW_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function calculateSimilarity(original: PixelGrid, rebuilt: PixelGrid): number {
  let matching = 0;
  let total = 0;
  for (let r = 0; r < original.length; r++) {
    for (let c = 0; c < (original[r]?.length || 0); c++) {
      total++;
      if (original[r][c] === rebuilt[r]?.[c]) matching++;
    }
  }
  return total > 0 ? Math.round((matching / total) * 100) : 0;
}

function mergeRelayBands(bands: RelayBand[], gridSize: number): PixelGrid {
  const merged = createEmptyGrid(gridSize);
  for (const band of bands) {
    for (let r = band.startRow; r < band.endRow && r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        merged[r][c] = band.canvas[r]?.[c] || 0;
      }
    }
  }
  return merged;
}

function pixelateGrid(grid: PixelGrid, level: number): PixelGrid {
  const size = grid.length;
  if (level >= 3) return grid; // Full resolution

  // Level 0: 4x4 blocks, Level 1: 8x8, Level 2: 16x16 (or smaller if grid is small)
  const blockSizes = [Math.max(4, Math.floor(size / 2)), Math.max(2, Math.floor(size / 4)), 1];
  const blockSize = blockSizes[level] || 1;

  const result = createEmptyGrid(size);
  for (let r = 0; r < size; r += blockSize) {
    for (let c = 0; c < size; c += blockSize) {
      // Find most common color in block
      const colorCounts = new Map<number, number>();
      for (let br = r; br < r + blockSize && br < size; br++) {
        for (let bc = c; bc < c + blockSize && bc < size; bc++) {
          const color = grid[br]?.[bc] || 0;
          colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
      }
      let maxColor = 0, maxCount = 0;
      for (const [color, count] of colorCounts) {
        if (count > maxCount) { maxColor = color; maxCount = count; }
      }
      // Fill block with dominant color
      for (let br = r; br < r + blockSize && br < size; br++) {
        for (let bc = c; bc < c + blockSize && bc < size; bc++) {
          result[br][bc] = maxColor;
        }
      }
    }
  }
  return result;
}

// ==================== Public API ====================

export function initPixelClash(
  roomCode: string,
  players: Map<string, string>,
  mode: PixelMode,
  totalRounds: number,
  gridSize: number = 10
): void {
  const state: PixelGameState = {
    rounds: [],
    currentRound: 0,
    totalRounds,
    mode,
    scores: new Map(),
    playerUsernames: players,
    playerOrder: Array.from(players.keys()),
    gridSize,
  };
  for (const id of players.keys()) state.scores.set(id, 0);
  activeGames.set(roomCode, state);
  logger.info('PARTY', `Pixel Clash initialized: ${roomCode}, mode=${mode}, ${players.size} players`);
}

export function startPixelRound(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.currentRound++;
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

function startTelephoneRound(io: Server, roomCode: string, game: PixelGameState, _prompt: string): void {
  const round: PixelRound = {
    mode: 'telephone',
    phase: 'write-prompt',
    prompt: '',
    gridSize: game.gridSize,
    chains: [],
    currentStepIndex: 0,
    timer: null,
  };

  // Each player writes a prompt
  game.rounds.push(round);
  io.to(`party:${roomCode}`).emit('party:pixel:phaseUpdate', {
    mode: 'telephone',
    phase: 'write-prompt',
    round: game.currentRound,
    totalRounds: game.totalRounds,
    timeSeconds: 30,
  });

  round.timer = setTimeout(() => {
    advanceTelephoneStep(io, roomCode);
  }, 30000);
}

export function submitTelephonePrompt(io: Server, roomCode: string, socketId: string, text: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || round.phase !== 'write-prompt') return;

  if (!round.chains) round.chains = [];
  const username = game.playerUsernames.get(socketId) || 'Unknown';

  // Create a new chain starting with this player's prompt
  round.chains.push({
    id: `chain_${socketId}`,
    originPlayer: socketId,
    steps: [{ playerId: socketId, username, type: 'write', content: text.trim().slice(0, 50), timestamp: Date.now() }],
  });

  if (round.chains.length >= game.playerOrder.length) {
    if (round.timer) clearTimeout(round.timer);
    advanceTelephoneStep(io, roomCode);
  }
}

function advanceTelephoneStep(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || !round.chains) return;

  round.currentStepIndex = (round.currentStepIndex || 0) + 1;

  // Alternate between draw and write, total steps = player count
  if (round.currentStepIndex >= game.playerOrder.length) {
    // Chain complete → gallery reveal
    startTelephoneReveal(io, roomCode, game, round);
    return;
  }

  const isDraw = round.currentStepIndex % 2 === 1;
  round.phase = isDraw ? 'drawing' : 'guessing';

  // Assign each player to a different chain (round-robin shift)
  const assignments: Array<{ playerId: string; chainId: string; content: string | PixelGrid }> = [];
  for (let i = 0; i < game.playerOrder.length; i++) {
    const playerId = game.playerOrder[i];
    const chainIdx = (i + (round.currentStepIndex || 0)) % round.chains.length;
    const chain = round.chains[chainIdx];
    const lastStep = chain.steps[chain.steps.length - 1];
    assignments.push({ playerId, chainId: chain.id, content: lastStep.content });
  }

  // Send each player their assignment privately
  for (const assignment of assignments) {
    io.to(assignment.playerId).emit('party:pixel:assignment', {
      phase: round.phase,
      content: assignment.content,
      chainId: assignment.chainId,
      timeSeconds: isDraw ? 60 : 30,
      gridSize: game.gridSize,
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

export function submitTelephoneStep(io: Server, roomCode: string, socketId: string, chainId: string, content: string | PixelGrid): void {
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

  // Check if all players submitted for this step
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

  // Reveal chains one by one
  const chains = round.chains || [];
  chains.forEach((chain, index) => {
    setTimeout(() => {
      io.to(`party:${roomCode}`).emit('party:pixel:chainReveal', {
        chain,
        index,
        total: chains.length,
      });
    }, index * 8000); // 8 seconds per chain
  });

  // After all revealed, advance
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
    gridSize: game.gridSize,
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
    gridSize: game.gridSize,
  });

  round.timer = setTimeout(() => {
    advanceShowdownToVote(io, roomCode);
  }, 60000);
}

export function submitShowdownCanvas(io: Server, roomCode: string, socketId: string, canvas: PixelGrid): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || round.phase !== 'showdown-draw' || !round.canvases) return;

  round.canvases.set(socketId, canvas);

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

  // Send all canvases anonymized (numbered)
  const entries = Array.from(round.canvases.entries())
    .sort(() => Math.random() - 0.5)
    .map(([socketId, canvas], index) => ({
      id: socketId,
      canvas,
      number: index + 1,
    }));

  io.to(`party:${roomCode}`).emit('party:pixel:showdownCanvases', {
    canvases: entries.map(e => ({ id: e.id, canvas: e.canvas, number: e.number })),
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
  if (best === socketId || funniest === socketId) return; // Can't vote for self

  round.votes.set(socketId, { best, funniest });
}

function advanceShowdownToCrown(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round || !round.votes || !round.canvases) return;

  round.phase = 'crown';
  if (round.timer) clearTimeout(round.timer);

  // Tally votes
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

  // Award points
  if (bestWinner) game.scores.set(bestWinner, (game.scores.get(bestWinner) || 0) + 500);
  if (funniestWinner) game.scores.set(funniestWinner, (game.scores.get(funniestWinner) || 0) + 300);

  io.to(`party:${roomCode}`).emit('party:pixel:showdownResults', {
    bestWinner: { id: bestWinner, username: game.playerUsernames.get(bestWinner) || 'Unknown', votes: bestMax },
    funniestWinner: { id: funniestWinner, username: game.playerUsernames.get(funniestWinner) || 'Unknown', votes: funniestMax },
    canvases: Array.from(round.canvases.entries()).map(([id, canvas]) => ({
      id,
      username: game.playerUsernames.get(id) || 'Unknown',
      canvas,
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
  // Pick artist (rotate each round)
  const artistIdx = (game.currentRound - 1) % game.playerOrder.length;
  const artistId = game.playerOrder[artistIdx];
  const artistUsername = game.playerUsernames.get(artistId) || 'Unknown';

  const round: PixelRound = {
    mode: 'relay',
    phase: 'relay-artist',
    prompt,
    gridSize: game.gridSize,
    relay: {
      artistId,
      artistUsername,
      originalCanvas: createEmptyGrid(game.gridSize),
      prompt,
      bands: [],
      pixelationLevel: 0,
      mergedCanvas: null,
      similarityScore: 0,
    },
    timer: null,
  };

  game.rounds.push(round);

  // Tell artist the prompt (private)
  io.to(artistId).emit('party:pixel:relayArtistStart', {
    prompt,
    gridSize: game.gridSize,
    timeSeconds: 60,
  });

  // Tell everyone else to watch
  io.to(`party:${roomCode}`).emit('party:pixel:phaseUpdate', {
    mode: 'relay',
    phase: 'relay-artist',
    artistUsername,
    round: game.currentRound,
    totalRounds: game.totalRounds,
    timeSeconds: 60,
    gridSize: game.gridSize,
  });

  // Progressive de-pixelation: update every 15 seconds
  const pixelationSteps = [0, 1, 2]; // At 15s, 30s, 45s
  pixelationSteps.forEach((level, i) => {
    setTimeout(() => {
      const currentRound = game.rounds[game.rounds.length - 1];
      if (!currentRound?.relay) return;
      currentRound.relay.pixelationLevel = level;
      const pixelated = pixelateGrid(currentRound.relay.originalCanvas, level);
      io.to(`party:${roomCode}`).emit('party:pixel:pixelationLevel', {
        level,
        canvas: pixelated,
      });
    }, (i + 1) * 15000);
  });

  // At 57s, show clear for 3 seconds
  setTimeout(() => {
    const currentRound = game.rounds[game.rounds.length - 1];
    if (!currentRound?.relay) return;
    io.to(`party:${roomCode}`).emit('party:pixel:pixelationLevel', {
      level: 3,
      canvas: currentRound.relay.originalCanvas,
    });
  }, 57000);

  // After 60s, split and start build phase
  round.timer = setTimeout(() => {
    startRelayBuild(io, roomCode);
  }, 60000);
}

export function submitRelayArtistCanvas(io: Server, roomCode: string, socketId: string, canvas: PixelGrid): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay || round.relay.artistId !== socketId) return;

  round.relay.originalCanvas = canvas;

  // Send pixelated version to spectators in real-time
  const pixelated = pixelateGrid(canvas, round.relay.pixelationLevel);
  io.to(`party:${roomCode}`).emit('party:pixel:pixelationLevel', {
    level: round.relay.pixelationLevel,
    canvas: pixelated,
  });
}

function startRelayBuild(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay) return;

  round.phase = 'relay-build';
  if (round.timer) clearTimeout(round.timer);

  // Assign builders (everyone except artist)
  const builders = game.playerOrder.filter(id => id !== round.relay!.artistId);
  const gridSize = game.gridSize;
  const bandCount = Math.min(builders.length, 3); // Max 3 bands
  const rowsPerBand = Math.floor(gridSize / bandCount);

  const bands: RelayBand[] = [];
  for (let i = 0; i < bandCount && i < builders.length; i++) {
    const startRow = i * rowsPerBand;
    const endRow = i === bandCount - 1 ? gridSize : (i + 1) * rowsPerBand;
    bands.push({
      builderId: builders[i],
      builderUsername: game.playerUsernames.get(builders[i]) || 'Unknown',
      startRow,
      endRow,
      canvas: createEmptyGrid(gridSize),
    });
  }

  round.relay.bands = bands;

  // Send each builder their band fragment
  for (const band of bands) {
    // Extract their band from original
    const fragment = createEmptyGrid(gridSize);
    for (let r = band.startRow; r < band.endRow; r++) {
      for (let c = 0; c < gridSize; c++) {
        fragment[r][c] = round.relay.originalCanvas[r]?.[c] || 0;
      }
    }

    io.to(band.builderId).emit('party:pixel:relayBuildStart', {
      bandFragment: fragment,
      startRow: band.startRow,
      endRow: band.endRow,
      gridSize,
      timeSeconds: 30,
    });
  }

  // Tell TV to show live builder canvases
  io.to(`party:${roomCode}`).emit('party:pixel:relayBands', {
    bands: bands.map(b => ({
      builderId: b.builderId,
      builderUsername: b.builderUsername,
      startRow: b.startRow,
      endRow: b.endRow,
    })),
    timeSeconds: 30,
  });

  round.timer = setTimeout(() => {
    startRelayMerge(io, roomCode);
  }, 30000);
}

export function submitRelayBuilderCanvas(io: Server, roomCode: string, socketId: string, canvas: PixelGrid): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay) return;

  const band = round.relay.bands.find(b => b.builderId === socketId);
  if (!band) return;
  band.canvas = canvas;

  // Broadcast live update to TV
  io.to(`party:${roomCode}`).emit('party:pixel:canvasUpdate', {
    playerId: socketId,
    canvas,
  });
}

function startRelayMerge(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round?.relay) return;

  round.phase = 'relay-merge';
  if (round.timer) clearTimeout(round.timer);

  // Merge all bands
  const merged = mergeRelayBands(round.relay.bands, game.gridSize);
  const similarity = calculateSimilarity(round.relay.originalCanvas, merged);

  round.relay.mergedCanvas = merged;
  round.relay.similarityScore = similarity;

  // Award points based on similarity
  const points = Math.round(similarity * 10); // Max 1000
  for (const band of round.relay.bands) {
    game.scores.set(band.builderId, (game.scores.get(band.builderId) || 0) + points);
  }
  // Artist gets points too (for creating a good reference)
  game.scores.set(round.relay.artistId, (game.scores.get(round.relay.artistId) || 0) + Math.round(points * 0.5));

  // Broadcast merge reveal
  io.to(`party:${roomCode}`).emit('party:pixel:mergeReveal', {
    merged,
    original: round.relay.originalCanvas,
    prompt: round.relay.prompt,
    score: similarity,
    artistUsername: round.relay.artistUsername,
    bands: round.relay.bands.map(b => ({
      builderUsername: b.builderUsername,
      startRow: b.startRow,
      endRow: b.endRow,
    })),
  });

  // Advance after reveal
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

  setTimeout(() => activeGames.delete(roomCode), 60000);
  logger.info('PARTY', `Pixel Clash ended in ${roomCode}. Winner: ${finalScores[0]?.username}`);
}

export function cleanupPixelClash(roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (game) {
    for (const round of game.rounds) {
      if (round.timer) clearTimeout(round.timer);
    }
  }
  activeGames.delete(roomCode);
}
