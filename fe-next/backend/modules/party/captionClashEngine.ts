/**
 * Caption Clash Game Engine
 * Manages round flow: show image → write → lineup reveal → vote → crown
 */

import type { Server } from 'socket.io';
import logger from '../../utils/logger.js';

// ==================== Types ====================

interface CaptionSubmission {
  id: string;
  socketId: string;
  username: string;
  text: string;
  submittedAt: number;
}

interface CaptionRoundState {
  imageUrl: string;
  imageId: string;
  phase: 'writing' | 'lineup' | 'voting' | 'crown' | 'speed-writing';
  submissions: Map<string, CaptionSubmission>;
  votes: Map<string, string>; // voterSocketId -> submissionId
  laughs: Map<string, number>; // submissionId -> count
  revealIndex: number;
  roundNumber: number;
  isSpeedRound: boolean;
  isRoastRound: boolean;
  roastTarget?: string;
  timer: ReturnType<typeof setTimeout> | null;
}

interface CaptionGameState {
  rounds: CaptionRoundState[];
  currentRound: number;
  totalRounds: number;
  scores: Map<string, number>;
  playerUsernames: Map<string, string>;
}

// ==================== Meme Templates ====================

/** Starter set of meme-worthy stock image descriptions + placeholder URLs.
 *  In production these will be actual image URLs. For alpha, using placeholder. */
const MEME_TEMPLATES = [
  { id: 'confused-cat', url: '/images/memes/confused-cat.jpg', tags: ['animal', 'reaction'] },
  { id: 'disaster-girl', url: '/images/memes/disaster-girl.jpg', tags: ['reaction', 'chaos'] },
  { id: 'this-is-fine', url: '/images/memes/this-is-fine.jpg', tags: ['reaction', 'fire'] },
  { id: 'expanding-brain', url: '/images/memes/expanding-brain.jpg', tags: ['tier', 'smart'] },
  { id: 'distracted-bf', url: '/images/memes/distracted-bf.jpg', tags: ['relationship', 'reaction'] },
  { id: 'drake-hotline', url: '/images/memes/drake-hotline.jpg', tags: ['comparison', 'preference'] },
  { id: 'success-kid', url: '/images/memes/success-kid.jpg', tags: ['victory', 'reaction'] },
  { id: 'uno-draw25', url: '/images/memes/uno-draw25.jpg', tags: ['choice', 'reaction'] },
  { id: 'woman-yelling-cat', url: '/images/memes/woman-yelling-cat.jpg', tags: ['argument', 'reaction'] },
  { id: 'bernie-chair', url: '/images/memes/bernie-chair.jpg', tags: ['sitting', 'mood'] },
  { id: 'stonks', url: '/images/memes/stonks.jpg', tags: ['finance', 'success'] },
  { id: 'hide-pain-harold', url: '/images/memes/hide-pain-harold.jpg', tags: ['pain', 'smile'] },
  { id: 'roll-safe', url: '/images/memes/roll-safe.jpg', tags: ['thinking', 'smart'] },
  { id: 'two-buttons', url: '/images/memes/two-buttons.jpg', tags: ['choice', 'stress'] },
  { id: 'change-my-mind', url: '/images/memes/change-my-mind.jpg', tags: ['debate', 'opinion'] },
  { id: 'surprised-pikachu', url: '/images/memes/surprised-pikachu.jpg', tags: ['surprise', 'reaction'] },
  { id: 'trade-offer', url: '/images/memes/trade-offer.jpg', tags: ['deal', 'negotiation'] },
  { id: 'always-has-been', url: '/images/memes/always-has-been.jpg', tags: ['revelation', 'space'] },
  { id: 'galaxy-brain', url: '/images/memes/galaxy-brain.jpg', tags: ['genius', 'tier'] },
  { id: 'waiting-skeleton', url: '/images/memes/waiting-skeleton.jpg', tags: ['waiting', 'patience'] },
];

// ==================== Game State Storage ====================

const activeGames = new Map<string, CaptionGameState>();

// ==================== Engine ====================

function pickRandomImage(usedIds: string[]): typeof MEME_TEMPLATES[0] {
  const available = MEME_TEMPLATES.filter(t => !usedIds.includes(t.id));
  const pool = available.length > 0 ? available : MEME_TEMPLATES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateSubmissionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildWordCloud(submissions: Map<string, CaptionSubmission>): Array<{ word: string; count: number }> {
  const wordCounts = new Map<string, number>();
  const stopWords = new Set(['the', 'a', 'an', 'is', 'it', 'to', 'in', 'of', 'and', 'or', 'my', 'me', 'i', 'you', 'we', 'when', 'that', 'this', 'for', 'on', 'at', 'be', 'as', 'do', 'so', 'if', 'no', 'not', 'but']);

  for (const sub of submissions.values()) {
    const words = sub.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && !stopWords.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }

  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

function calculateScores(round: CaptionRoundState): Map<string, number> {
  const scores = new Map<string, number>();
  const totalVotes = round.votes.size;
  if (totalVotes === 0) return scores;

  // Count votes per submission
  const voteCounts = new Map<string, number>();
  for (const submissionId of round.votes.values()) {
    voteCounts.set(submissionId, (voteCounts.get(submissionId) || 0) + 1);
  }

  // Award percentage-based points
  for (const [subId, count] of voteCounts.entries()) {
    const submission = round.submissions.get(subId);
    if (!submission) continue;

    const percentage = count / totalVotes;
    let points = Math.round(percentage * 1000);

    // Perfect caption bonus (100% of votes)
    if (count === totalVotes && totalVotes >= 3) {
      points = Math.round(points * 1.25);
    }

    // Laugh bonus (capped at +200)
    const laughCount = round.laughs.get(subId) || 0;
    points += Math.min(laughCount * 10, 200);

    scores.set(submission.socketId, (scores.get(submission.socketId) || 0) + points);
  }

  return scores;
}

// ==================== Public API ====================

export function initCaptionClash(
  roomCode: string,
  players: Map<string, string>, // socketId -> username
  totalRounds: number
): void {
  const state: CaptionGameState = {
    rounds: [],
    currentRound: 0,
    totalRounds,
    scores: new Map(),
    playerUsernames: players,
  };

  for (const socketId of players.keys()) {
    state.scores.set(socketId, 0);
  }

  activeGames.set(roomCode, state);
  logger.info('PARTY', `Caption Clash initialized for ${roomCode} with ${players.size} players, ${totalRounds} rounds`);
}

export function startCaptionRound(
  io: Server,
  roomCode: string
): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.currentRound++;
  const usedImageIds = game.rounds.map(r => r.imageId);
  const image = pickRandomImage(usedImageIds);

  const isSpeedRound = game.currentRound === game.totalRounds - 1;
  const isRoastRound = game.currentRound === game.totalRounds;
  let roastTarget: string | undefined;

  if (isRoastRound) {
    // Pick a random player to roast
    const playerEntries = Array.from(game.playerUsernames.entries());
    const randomIdx = Math.floor(Math.random() * playerEntries.length);
    roastTarget = playerEntries[randomIdx][1];
  }

  const round: CaptionRoundState = {
    imageUrl: image.url,
    imageId: image.id,
    phase: isSpeedRound ? 'speed-writing' : 'writing',
    submissions: new Map(),
    votes: new Map(),
    laughs: new Map(),
    revealIndex: -1,
    roundNumber: game.currentRound,
    isSpeedRound,
    isRoastRound,
    roastTarget,
    timer: null,
  };

  game.rounds.push(round);

  // Broadcast image to all
  const socketRoom = `party:${roomCode}`;
  io.to(socketRoom).emit('party:caption:imageReady', {
    imageUrl: round.imageUrl,
    imageId: round.imageId,
    round: game.currentRound,
    totalRounds: game.totalRounds,
    isSpeedRound,
    isRoastRound,
    roastTarget,
    writeTimeSeconds: isSpeedRound ? 15 : 45,
  });

  // Set write timer
  const writeTime = isSpeedRound ? 15000 : 45000;
  round.timer = setTimeout(() => {
    advanceToLineup(io, roomCode);
  }, writeTime);

  logger.info('PARTY', `Caption round ${game.currentRound} started in ${roomCode} (speed=${isSpeedRound}, roast=${isRoastRound})`);
}

export function submitCaption(
  io: Server,
  roomCode: string,
  socketId: string,
  text: string
): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const round = game.rounds[game.rounds.length - 1];
  if (!round || (round.phase !== 'writing' && round.phase !== 'speed-writing')) return;

  const username = game.playerUsernames.get(socketId) || 'Unknown';
  const submission: CaptionSubmission = {
    id: generateSubmissionId(),
    socketId,
    username,
    text: text.trim().slice(0, 200),
    submittedAt: Date.now(),
  };

  round.submissions.set(submission.id, submission);

  // Broadcast submission count
  const socketRoom = `party:${roomCode}`;
  io.to(socketRoom).emit('party:caption:submissionCount', {
    count: round.submissions.size,
    total: game.playerUsernames.size,
  });

  // Build and broadcast word cloud
  const wordCloud = buildWordCloud(round.submissions);
  io.to(socketRoom).emit('party:caption:wordCloud', { words: wordCloud });

  // If all submitted, skip timer and advance
  if (round.submissions.size >= game.playerUsernames.size) {
    if (round.timer) clearTimeout(round.timer);
    advanceToLineup(io, roomCode);
  }
}

export function submitLaugh(
  roomCode: string,
  submissionId: string,
  io: Server
): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const round = game.rounds[game.rounds.length - 1];
  if (!round || round.phase !== 'lineup') return;

  const current = round.laughs.get(submissionId) || 0;
  round.laughs.set(submissionId, current + 1);

  io.to(`party:${roomCode}`).emit('party:caption:laughUpdate', {
    submissionId,
    count: current + 1,
  });
}

export function submitVote(
  io: Server,
  roomCode: string,
  voterSocketId: string,
  submissionId: string
): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const round = game.rounds[game.rounds.length - 1];
  if (!round || round.phase !== 'voting') return;

  // Can't vote for own submission
  const submission = round.submissions.get(submissionId);
  if (!submission || submission.socketId === voterSocketId) return;

  round.votes.set(voterSocketId, submissionId);

  // If all voted, advance to crown
  if (round.votes.size >= game.playerUsernames.size - 1) { // -1: author can't vote
    if (round.timer) clearTimeout(round.timer);
    advanceToCrown(io, roomCode);
  }
}

function advanceToLineup(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const round = game.rounds[game.rounds.length - 1];
  if (!round) return;

  round.phase = 'lineup';
  round.revealIndex = 0;

  const submissions = Array.from(round.submissions.values());
  if (submissions.length === 0) {
    // No submissions, skip to next round
    advanceToNextRound(io, roomCode);
    return;
  }

  // Shuffle submissions for reveal
  const shuffled = [...submissions].sort(() => Math.random() - 0.5);

  // Reveal one at a time with delays
  const revealInterval = 4000; // 4 seconds per caption

  io.to(`party:${roomCode}`).emit('party:phaseChange', {
    phase: 'playing',
    gameState: { type: 'caption-clash', phase: 'lineup' },
  });

  shuffled.forEach((sub, index) => {
    setTimeout(() => {
      io.to(`party:${roomCode}`).emit('party:caption:revealCaption', {
        submission: { id: sub.id, username: sub.username, text: sub.text, submittedAt: sub.submittedAt },
        index,
        total: shuffled.length,
      });
    }, index * revealInterval);
  });

  // After all revealed, advance to voting
  round.timer = setTimeout(() => {
    advanceToVoting(io, roomCode);
  }, shuffled.length * revealInterval + 2000);
}

function advanceToVoting(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const round = game.rounds[game.rounds.length - 1];
  if (!round) return;

  round.phase = 'voting';
  const submissions = Array.from(round.submissions.values()).map(s => ({
    id: s.id,
    username: s.username,
    text: s.text,
    submittedAt: s.submittedAt,
    socketId: s.socketId,
  }));

  io.to(`party:${roomCode}`).emit('party:phaseChange', {
    phase: 'voting',
    gameState: {
      type: 'caption-clash',
      phase: 'voting',
      submissions: submissions.map(({ socketId, ...rest }) => rest),
    },
  });

  // Vote timer (20 seconds)
  round.timer = setTimeout(() => {
    advanceToCrown(io, roomCode);
  }, 20000);
}

function advanceToCrown(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const round = game.rounds[game.rounds.length - 1];
  if (!round) return;

  round.phase = 'crown';
  if (round.timer) clearTimeout(round.timer);

  // Calculate round scores
  const roundScores = calculateScores(round);

  // Update cumulative scores
  for (const [socketId, points] of roundScores.entries()) {
    const current = game.scores.get(socketId) || 0;
    game.scores.set(socketId, current + points);
  }

  // Build vote results
  const voteCounts = new Map<string, number>();
  const totalVotes = round.votes.size;
  for (const submissionId of round.votes.values()) {
    voteCounts.set(submissionId, (voteCounts.get(submissionId) || 0) + 1);
  }

  const maxVotes = Math.max(0, ...voteCounts.values());
  const results = Array.from(round.submissions.values())
    .map(sub => ({
      submission: { id: sub.id, username: sub.username, text: sub.text, submittedAt: sub.submittedAt },
      votes: voteCounts.get(sub.id) || 0,
      percentage: totalVotes > 0 ? Math.round(((voteCounts.get(sub.id) || 0) / totalVotes) * 100) : 0,
      isWinner: (voteCounts.get(sub.id) || 0) === maxVotes && maxVotes > 0,
      points: roundScores.get(sub.socketId) || 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  io.to(`party:${roomCode}`).emit('party:caption:voteResults', { results });

  // After 6 seconds showing crown, advance
  round.timer = setTimeout(() => {
    advanceToNextRound(io, roomCode);
  }, 6000);
}

function advanceToNextRound(io: Server, roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;

  if (game.currentRound >= game.totalRounds) {
    // Game over
    endGame(io, roomCode);
  } else {
    startCaptionRound(io, roomCode);
  }
}

function endGame(io: Server, roomCode: string): void {
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
    gameId: 'caption-clash',
    finalScores,
    roundResults: [],
    mvp: finalScores[0]?.username,
  });

  io.to(`party:${roomCode}`).emit('party:phaseChange', {
    phase: 'results',
    gameState: null,
  });

  // Cleanup after a delay
  setTimeout(() => {
    activeGames.delete(roomCode);
  }, 60000);

  logger.info('PARTY', `Caption Clash ended in ${roomCode}. Winner: ${finalScores[0]?.username}`);
}

export function cleanupCaptionClash(roomCode: string): void {
  const game = activeGames.get(roomCode);
  if (game) {
    for (const round of game.rounds) {
      if (round.timer) clearTimeout(round.timer);
    }
  }
  activeGames.delete(roomCode);
}

export function getCaptionGameState(roomCode: string): CaptionGameState | undefined {
  return activeGames.get(roomCode);
}

/**
 * Re-send the current round's image to ONE socket (state-on-demand).
 * Fixes the round-1 "Starting..." race: party:caption:imageReady is a one-shot
 * broadcast at round start, so a phone that mounts on the start transition (or
 * a late joiner) misses it. The client requests state on mount and we replay
 * the image just to that socket.
 */
export function resendCaptionState(io: Server, roomCode: string, socketId: string): void {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const round = game.rounds[game.rounds.length - 1];
  if (!round) return;
  if (round.phase === 'writing' || round.phase === 'speed-writing') {
    io.to(socketId).emit('party:caption:imageReady', {
      imageUrl: round.imageUrl,
      imageId: round.imageId,
      round: round.roundNumber,
      totalRounds: game.totalRounds,
      isSpeedRound: round.isSpeedRound,
      isRoastRound: round.isRoastRound,
      roastTarget: round.roastTarget,
      writeTimeSeconds: round.isSpeedRound ? 15 : 45,
    });
  }
}
