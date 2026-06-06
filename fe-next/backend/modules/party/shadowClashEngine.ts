/**
 * Shadow Clash Game Engine
 * Social deduction: roles, night actions, day discussion, voting.
 * Supports standard (multi-round) and one-night variants.
 */

import type { Server } from 'socket.io';
import logger from '../../utils/logger.js';

// ==================== Types ====================

type ShadowRole = 'shadow' | 'seer' | 'medic' | 'citizen';
type ShadowTeam = 'evil' | 'good';
type GamePhase = 'dealing' | 'night' | 'dawn' | 'discussion' | 'trial' | 'verdict' | 'game-over';
type Variant = 'standard' | 'one-night';

interface NightActions {
  shadowTarget: string | null;
  shadowVotes: Map<string, string>; // shadowSocketId -> targetUsername
  seerTarget: string | null;
  seerResult: ShadowTeam | null;
  medicTarget: string | null;
}

interface EliminatedPlayer {
  username: string;
  role: ShadowRole;
  eliminatedBy: 'night' | 'vote';
  round: number;
}

interface ShadowGameState {
  variant: Variant;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  roles: Map<string, ShadowRole>; // socketId -> role
  alivePlayers: Set<string>; // socketIds
  eliminated: EliminatedPlayer[];
  nightActions: NightActions;
  votes: Map<string, string>; // voterSocketId -> targetUsername (or 'skip')
  playerUsernames: Map<string, string>; // socketId -> username
  usernameToSocket: Map<string, string>; // username -> socketId
  savedThisRound: boolean;
  winner: ShadowTeam | null;
  timer: ReturnType<typeof setTimeout> | null;
  discussionTimer: ReturnType<typeof setTimeout> | null;
}

// ==================== State ====================

const activeGames = new Map<string, ShadowGameState>();

// ==================== Role Assignment ====================

function assignRoles(playerIds: string[]): Map<string, ShadowRole> {
  const count = playerIds.length;
  const roles = new Map<string, ShadowRole>();
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

  // 2 shadows for 5-10 players
  const shadowCount = 2;
  const hasSeer = count >= 5;
  const hasMedic = count >= 6;

  let idx = 0;
  for (let i = 0; i < shadowCount && idx < shuffled.length; i++) {
    roles.set(shuffled[idx++], 'shadow');
  }
  if (hasSeer && idx < shuffled.length) {
    roles.set(shuffled[idx++], 'seer');
  }
  if (hasMedic && idx < shuffled.length) {
    roles.set(shuffled[idx++], 'medic');
  }
  while (idx < shuffled.length) {
    roles.set(shuffled[idx++], 'citizen');
  }

  return roles;
}

function getTeam(role: ShadowRole): ShadowTeam {
  return role === 'shadow' ? 'evil' : 'good';
}

function getShadowPartner(game: ShadowGameState, socketId: string): string | undefined {
  for (const [id, role] of game.roles) {
    if (role === 'shadow' && id !== socketId) {
      return game.playerUsernames.get(id);
    }
  }
  return undefined;
}

// ==================== Win Condition ====================

function checkWinCondition(game: ShadowGameState): ShadowTeam | null {
  let shadowsAlive = 0;
  let goodAlive = 0;
  for (const id of game.alivePlayers) {
    const role = game.roles.get(id);
    if (role === 'shadow') shadowsAlive++;
    else goodAlive++;
  }

  if (shadowsAlive === 0) return 'good';
  if (shadowsAlive >= goodAlive) return 'evil';
  if (game.round >= game.maxRounds) return 'good'; // Time ran out, good wins by survival
  return null;
}

// ==================== Public API ====================

export function initShadowClash(
  roomCode: string,
  players: Map<string, string>,
  variant: Variant = 'standard',
  maxRounds: number = 4
): void {
  const roles = assignRoles(Array.from(players.keys()));
  const usernameToSocket = new Map<string, string>();
  for (const [id, name] of players) usernameToSocket.set(name, id);

  const state: ShadowGameState = {
    variant,
    phase: 'dealing',
    round: 0,
    maxRounds: variant === 'one-night' ? 1 : maxRounds,
    roles,
    alivePlayers: new Set(players.keys()),
    eliminated: [],
    nightActions: { shadowTarget: null, shadowVotes: new Map(), seerTarget: null, seerResult: null, medicTarget: null },
    votes: new Map(),
    playerUsernames: players,
    usernameToSocket: usernameToSocket,
    savedThisRound: false,
    winner: null,
    timer: null,
    discussionTimer: null,
  };

  activeGames.set(roomCode, state);
  logger.info('PARTY', `Shadow Clash initialized: ${roomCode}, ${players.size} players, variant=${variant}`);
}

export function startShadowClash(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.phase = 'dealing';

  // Send role cards privately to each player
  for (const [socketId, role] of game.roles) {
    const team = getTeam(role);
    const partnerUsername = role === 'shadow' ? getShadowPartner(game, socketId) : undefined;

    io.to(socketId).emit('party:shadow:roleAssigned', {
      role,
      team,
      partnerUsername,
    });
  }

  // Broadcast dealing animation to TV
  io.to(`party:${roomCode}`).emit('party:phaseChange', {
    phase: 'playing',
    gameState: {
      type: 'shadow-clash',
      phase: 'dealing',
      alivePlayers: Array.from(game.alivePlayers).map(id => game.playerUsernames.get(id) || 'Unknown'),
    },
  });

  // After dealing animation (5s), start night
  game.timer = setTimeout(() => {
    startNight(io, roomCode);
  }, 5000);
}

function startNight(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.round++;
  game.phase = 'night';
  game.nightActions = { shadowTarget: null, shadowVotes: new Map(), seerTarget: null, seerResult: null, medicTarget: null };
  game.savedThisRound = false;

  const aliveUsernames = Array.from(game.alivePlayers).map(id => game.playerUsernames.get(id) || 'Unknown');

  // Broadcast night phase to TV
  io.to(`party:${roomCode}`).emit('party:shadow:nightStart', {
    round: game.round,
    maxRounds: game.maxRounds,
    aliveCount: game.alivePlayers.size,
  });

  // Send night action prompts to active roles
  for (const socketId of game.alivePlayers) {
    const role = game.roles.get(socketId);
    const targets = aliveUsernames.filter(u => u !== game.playerUsernames.get(socketId));

    if (role === 'shadow') {
      io.to(socketId).emit('party:shadow:nightAction', {
        action: 'choose-target',
        targets,
        message: 'Choose a player to eliminate',
      });
    } else if (role === 'seer') {
      io.to(socketId).emit('party:shadow:nightAction', {
        action: 'investigate',
        targets: aliveUsernames, // Seer can investigate anyone
        message: 'Choose a player to investigate',
      });
    } else if (role === 'medic') {
      io.to(socketId).emit('party:shadow:nightAction', {
        action: 'protect',
        targets: aliveUsernames,
        message: 'Choose a player to protect',
      });
    } else {
      // Citizens get a decoy screen
      io.to(socketId).emit('party:shadow:nightAction', {
        action: 'wait',
        targets: [],
        message: 'The night is dark...',
      });
    }
  }

  // Night auto-resolves after 30 seconds
  game.timer = setTimeout(() => {
    resolveNight(io, roomCode);
  }, 30000);
}

export function submitNightAction(io: Server, roomCode: string, socketId: string, targetUsername: string): void {
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== 'night') return;
  if (!game.alivePlayers.has(socketId)) return;

  const role = game.roles.get(socketId);

  if (role === 'shadow') {
    game.nightActions.shadowVotes.set(socketId, targetUsername);
    // If both shadows voted, resolve their target
    const shadowIds = Array.from(game.roles.entries()).filter(([id, r]) => r === 'shadow' && game.alivePlayers.has(id));
    if (game.nightActions.shadowVotes.size >= shadowIds.length) {
      // Pick most voted target, or random if tie
      const voteCounts = new Map<string, number>();
      for (const target of game.nightActions.shadowVotes.values()) {
        voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
      }
      let maxTarget = '', maxCount = 0;
      for (const [target, count] of voteCounts) {
        if (count > maxCount) { maxTarget = target; maxCount = count; }
      }
      game.nightActions.shadowTarget = maxTarget;
    }
  } else if (role === 'seer') {
    game.nightActions.seerTarget = targetUsername;
    const targetSocketId = game.usernameToSocket.get(targetUsername);
    if (targetSocketId) {
      const targetRole = game.roles.get(targetSocketId);
      game.nightActions.seerResult = targetRole ? getTeam(targetRole) : 'good';
      // Send result immediately to seer
      io.to(socketId).emit('party:shadow:seerResult', {
        target: targetUsername,
        team: game.nightActions.seerResult,
      });
    }
  } else if (role === 'medic') {
    game.nightActions.medicTarget = targetUsername;
  }

  // Check if all roles have acted
  const allActed = checkAllNightActionsComplete(game);
  if (allActed) {
    if (game.timer) clearTimeout(game.timer);
    resolveNight(io, roomCode);
  }
}

function checkAllNightActionsComplete(game: ShadowGameState): boolean {
  for (const socketId of game.alivePlayers) {
    const role = game.roles.get(socketId);
    if (role === 'shadow' && !game.nightActions.shadowVotes.has(socketId)) return false;
    if (role === 'seer' && !game.nightActions.seerTarget) return false;
    if (role === 'medic' && !game.nightActions.medicTarget) return false;
  }
  return true;
}

function resolveNight(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.phase = 'dawn';
  if (game.timer) clearTimeout(game.timer);

  const target = game.nightActions.shadowTarget;
  let eliminatedUsername: string | null = null;
  let eliminatedRole: ShadowRole | null = null;
  let saved = false;

  if (target) {
    // Check if medic saved the target
    if (game.nightActions.medicTarget === target) {
      saved = true;
      game.savedThisRound = true;
    } else {
      // Eliminate the target
      const targetSocketId = game.usernameToSocket.get(target);
      if (targetSocketId && game.alivePlayers.has(targetSocketId)) {
        game.alivePlayers.delete(targetSocketId);
        eliminatedUsername = target;
        eliminatedRole = game.roles.get(targetSocketId) || 'citizen';
        game.eliminated.push({
          username: target,
          role: eliminatedRole,
          eliminatedBy: 'night',
          round: game.round,
        });
      }
    }
  }

  // Broadcast dawn to TV
  io.to(`party:${roomCode}`).emit('party:shadow:dawn', {
    eliminated: eliminatedUsername,
    role: eliminatedRole,
    saved,
    round: game.round,
    aliveCount: game.alivePlayers.size,
  });

  // Notify eliminated player
  if (eliminatedUsername) {
    const eliminatedSocket = game.usernameToSocket.get(eliminatedUsername);
    if (eliminatedSocket) {
      io.to(eliminatedSocket).emit('party:shadow:youWereEliminated', {
        eliminatedBy: 'night',
        yourRole: eliminatedRole,
      });
    }
  }

  // Check win condition
  const winner = checkWinCondition(game);
  if (winner) {
    game.timer = setTimeout(() => endGame(io, roomCode, winner), 5000);
    return;
  }

  // After dawn reveal (5s), start discussion
  game.timer = setTimeout(() => {
    startDiscussion(io, roomCode);
  }, 5000);
}

function startDiscussion(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.phase = 'discussion';
  game.votes = new Map();

  const aliveUsernames = Array.from(game.alivePlayers).map(id => game.playerUsernames.get(id) || 'Unknown');
  const discussionTime = game.variant === 'one-night' ? 180 : 120; // 3 min for one-night, 2 min for standard

  io.to(`party:${roomCode}`).emit('party:shadow:discussionStart', {
    alivePlayerUsernames: aliveUsernames,
    eliminatedHistory: game.eliminated,
    timeSeconds: discussionTime,
    round: game.round,
  });

  // Discussion timer → auto-advance to trial
  game.discussionTimer = setTimeout(() => {
    startTrial(io, roomCode);
  }, discussionTime * 1000);
}

export function callVoteEarly(io: Server, roomCode: string, socketId: string): void {
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== 'discussion') return;
  if (!game.alivePlayers.has(socketId)) return;

  // Any alive player can call vote early
  if (game.discussionTimer) clearTimeout(game.discussionTimer);
  startTrial(io, roomCode);
}

function startTrial(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.phase = 'trial';
  if (game.discussionTimer) clearTimeout(game.discussionTimer);

  const aliveUsernames = Array.from(game.alivePlayers).map(id => game.playerUsernames.get(id) || 'Unknown');

  // Send vote prompt to all alive players
  for (const socketId of game.alivePlayers) {
    const myUsername = game.playerUsernames.get(socketId) || '';
    const targets = aliveUsernames.filter(u => u !== myUsername);
    io.to(socketId).emit('party:shadow:voteStart', {
      targets: [...targets, 'skip'],
      timeSeconds: 30,
    });
  }

  io.to(`party:${roomCode}`).emit('party:shadow:trialStart', {
    timeSeconds: 30,
  });

  game.timer = setTimeout(() => {
    resolveVote(io, roomCode);
  }, 30000);
}

export function submitVote(io: Server, roomCode: string, socketId: string, targetUsername: string): void {
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== 'trial') return;
  if (!game.alivePlayers.has(socketId)) return;

  game.votes.set(socketId, targetUsername);

  // Check if all alive players voted
  if (game.votes.size >= game.alivePlayers.size) {
    if (game.timer) clearTimeout(game.timer);
    resolveVote(io, roomCode);
  }
}

function resolveVote(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.phase = 'verdict';
  if (game.timer) clearTimeout(game.timer);

  // Count votes
  const voteCounts = new Map<string, number>();
  for (const target of game.votes.values()) {
    voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
  }

  // Find majority (>50% of alive players needed)
  const threshold = Math.floor(game.alivePlayers.size / 2) + 1;
  let eliminated: string | null = null;
  let eliminatedRole: ShadowRole | null = null;
  let maxVotes = 0;
  let maxTarget = '';

  for (const [target, count] of voteCounts) {
    if (count > maxVotes && target !== 'skip') {
      maxVotes = count;
      maxTarget = target;
    }
  }

  if (maxVotes >= threshold && maxTarget) {
    eliminated = maxTarget;
    const targetSocket = game.usernameToSocket.get(maxTarget);
    if (targetSocket) {
      eliminatedRole = game.roles.get(targetSocket) || 'citizen';
      game.alivePlayers.delete(targetSocket);
      game.eliminated.push({
        username: maxTarget,
        role: eliminatedRole,
        eliminatedBy: 'vote',
        round: game.round,
      });

      io.to(targetSocket).emit('party:shadow:youWereEliminated', {
        eliminatedBy: 'vote',
        yourRole: eliminatedRole,
      });
    }
  }

  // Build vote reveal (who voted for whom)
  const voteMap: Record<string, string> = {};
  for (const [voterId, target] of game.votes) {
    const voterName = game.playerUsernames.get(voterId) || 'Unknown';
    voteMap[voterName] = target;
  }

  io.to(`party:${roomCode}`).emit('party:shadow:voteReveal', {
    votes: voteMap,
    eliminated,
    role: eliminatedRole,
    noElimination: !eliminated,
    round: game.round,
  });

  // Check win
  const winner = checkWinCondition(game);
  if (winner || game.variant === 'one-night') {
    const finalWinner = winner || (game.variant === 'one-night' ? checkWinCondition(game) || 'good' : null);
    game.timer = setTimeout(() => endGame(io, roomCode, finalWinner || 'good'), 6000);
    return;
  }

  // Next night
  game.timer = setTimeout(() => {
    startNight(io, roomCode);
  }, 6000);
}

function endGame(io: Server, roomCode: string, winner: ShadowTeam): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.phase = 'game-over';
  game.winner = winner;
  if (game.timer) clearTimeout(game.timer);
  if (game.discussionTimer) clearTimeout(game.discussionTimer);

  // Reveal all roles
  const allRoles: Record<string, string> = {};
  for (const [socketId, role] of game.roles) {
    const username = game.playerUsernames.get(socketId) || 'Unknown';
    allRoles[username] = role;
  }

  io.to(`party:${roomCode}`).emit('party:shadow:gameOver', {
    winner,
    roles: allRoles,
    eliminated: game.eliminated,
  });

  // Also send generic game results
  const finalScores = Array.from(game.playerUsernames.entries()).map(([socketId, username]) => {
    const role = game.roles.get(socketId) || 'citizen';
    const team = getTeam(role);
    const won = team === winner;
    return {
      socketId,
      username,
      score: won ? 1000 : 0,
      rank: won ? 1 : 2,
    };
  });

  io.to(`party:${roomCode}`).emit('party:gameResults', {
    gameId: 'shadow-clash',
    finalScores,
    roundResults: [],
    mvp: winner === 'evil' ? 'The Shadows' : 'The Citizens',
  });

  io.to(`party:${roomCode}`).emit('party:phaseChange', {
    phase: 'results',
    gameState: null,
  });

  setTimeout(() => activeGames.delete(roomCode), 60000);
  logger.info('PARTY', `Shadow Clash ended in ${roomCode}. Winner: ${winner}`);
}

export function cleanupShadowClash(roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (game) {
    if (game.timer) clearTimeout(game.timer);
    if (game.discussionTimer) clearTimeout(game.discussionTimer);
  }
  activeGames.delete(roomCode);
}

/** Read-only accessor for the live game state (used by the solo bot driver). */
export function getShadowGameState(roomCode: string): ShadowGameState | undefined {
  return activeGames.get(roomCode);
}

/**
 * Replay current state to ONE socket that missed one-shot events (phone mounted
 * on the start transition, or a late join). roleAssigned is a private one-shot
 * that unlocks every downstream phone view, so it MUST go first — then the
 * current phase prompt (night/trial). State-on-demand via party:requestState.
 */
export function resendShadowState(io: Server, roomCode: string, socketId: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const role = game.roles.get(socketId);
  if (!role) return; // not a participant

  // 1) Always replay the private role card first (sets myRole on the phone).
  io.to(socketId).emit('party:shadow:roleAssigned', {
    role,
    team: getTeam(role),
    partnerUsername: role === 'shadow' ? getShadowPartner(game, socketId) : undefined,
  });

  // 2) Replay the current phase prompt (mirrors startNight / startTrial).
  if (!game.alivePlayers.has(socketId)) return;
  const aliveUsernames = Array.from(game.alivePlayers).map((id) => game.playerUsernames.get(id) || 'Unknown');

  if (game.phase === 'night') {
    const targets = aliveUsernames.filter((u) => u !== game.playerUsernames.get(socketId));
    if (role === 'shadow') {
      io.to(socketId).emit('party:shadow:nightAction', { action: 'choose-target', targets, message: 'Choose a player to eliminate' });
    } else if (role === 'seer') {
      io.to(socketId).emit('party:shadow:nightAction', { action: 'investigate', targets: aliveUsernames, message: 'Choose a player to investigate' });
    } else if (role === 'medic') {
      io.to(socketId).emit('party:shadow:nightAction', { action: 'protect', targets: aliveUsernames, message: 'Choose a player to protect' });
    } else {
      io.to(socketId).emit('party:shadow:nightAction', { action: 'wait', targets: [], message: 'The night is dark...' });
    }
  } else if (game.phase === 'trial') {
    const myUsername = game.playerUsernames.get(socketId) || '';
    const targets = aliveUsernames.filter((u) => u !== myUsername);
    io.to(socketId).emit('party:shadow:voteStart', { targets: [...targets, 'skip'], timeSeconds: 30 });
  } else if (game.phase === 'discussion') {
    io.to(socketId).emit('party:shadow:discussionStart', {
      alivePlayerUsernames: aliveUsernames,
      eliminatedHistory: game.eliminated,
      timeSeconds: game.variant === 'one-night' ? 180 : 120,
      round: game.round,
    });
  }
}
