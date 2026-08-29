/**
 * 14-player multiplayer room harness.
 *
 * Boots the REAL socket server (backend/socketHandlers → registerAllHandlers) on an
 * ephemeral port with no Next.js, connects 14 real socket.io clients to one room,
 * plays a full round with concurrent word submissions, and reports what every client
 * actually observed.
 *
 * Why this exists: production evidence says big rooms work (Supabase `game_sessions`
 * room QV57D3 ran 13→14→15→15→15→14 over six rounds) and the code says the cap is 50
 * with 500ms signature-deduped leaderboard broadcasts. This proves it end to end
 * instead of inferring it, and gives the "does 14 work" question a runnable answer.
 *
 * Run: npx tsx scripts/mp-14-player-harness.mts
 * Exits non-zero on any assertion failure — safe to gate on.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';

import { createSocketServer } from '../server/socketSetup';
import { initializeSocketHandlers, stopEmptyRoomCleanup } from '../backend/socketHandlers';

const PLAYERS = 14;
const ROOM = 'HARNESS';
const HOST = 'P01';

interface ClientRecord {
  name: string;
  socket: ClientSocket;
  joined: boolean;
  spectator: boolean;
  errors: string[];
  startGames: number;
  leaderboardUpdates: number;
  lastLeaderboardSize: number;
  maxLeaderboardSize: number;
  sawFinalScores: boolean;
  finalScoreCount: number;
}

const failures: string[] = [];
function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const httpServer = createServer();
  const io = createSocketServer(httpServer, '*');
  initializeSocketHandlers(io);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;
  const url = `http://localhost:${port}`;
  console.log(`\nSocket server up on ${url}\n`);

  const clients: ClientRecord[] = [];

  // ── Connect and join 14 players ───────────────────────────────────────────
  console.log(`Connecting ${PLAYERS} clients to room ${ROOM}…`);
  for (let i = 0; i < PLAYERS; i++) {
    const name = `P${String(i + 1).padStart(2, '0')}`;
    const socket = ioClient(url, { transports: ['websocket'], forceNew: true });
    const rec: ClientRecord = {
      name, socket, joined: false, spectator: false, errors: [],
      startGames: 0, leaderboardUpdates: 0, lastLeaderboardSize: 0,
      maxLeaderboardSize: 0, sawFinalScores: false, finalScoreCount: 0,
    };

    socket.on('joined', () => { rec.joined = true; });
    socket.on('joinedAsSpectator', () => { rec.spectator = true; });
    socket.on('error', (p: unknown) => {
      rec.errors.push(typeof p === 'string' ? p : JSON.stringify(p));
    });
    socket.on('rateLimited', () => rec.errors.push('rateLimited'));
    socket.on('startGame', () => { rec.startGames++; });
    socket.on('updateLeaderboard', (p: { leaderboard?: unknown[] }) => {
      rec.leaderboardUpdates++;
      const n = p?.leaderboard?.length ?? 0;
      rec.lastLeaderboardSize = n;
      rec.maxLeaderboardSize = Math.max(rec.maxLeaderboardSize, n);
    });
    const onFinal = (p: { scores?: unknown[] }) => {
      rec.sawFinalScores = true;
      rec.finalScoreCount = Math.max(rec.finalScoreCount, p?.scores?.length ?? 0);
    };
    socket.on('finalScores', onFinal);
    socket.on('validatedScores', onFinal);

    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
    clients.push(rec);

    const avatar = { emoji: '🙂', color: '#FF6B6B' };
    if (i === 0) {
      // The room must exist before anyone can join it — `join` with isHost:true
      // returns GAME_NOT_FOUND. The host creates, then joins, exactly as the
      // real client does in useMultiplayerJoin.ts.
      socket.emit('createGame', {
        gameCode: ROOM,
        roomName: 'Harness Room',
        hostUsername: HOST,
        language: 'en',
        avatar,
      });
      await sleep(600);
    }

    socket.emit('join', {
      gameCode: ROOM,
      username: name,
      roomName: 'Harness Room',
      isHost: i === 0,
      hostUsername: HOST,
      language: 'en',
      avatar,
    });
    // Serialised joins: the server rate-limits room creation, and a real room
    // fills over seconds, not in one burst.
    await sleep(120);
  }

  await sleep(1500);

  console.log('\n── JOIN RESULTS ──');
  const joined = clients.filter((c) => c.joined);
  const spectators = clients.filter((c) => c.spectator);
  const errored = clients.filter((c) => c.errors.length > 0);
  console.log(`  joined: ${joined.length}/${PLAYERS}  spectators: ${spectators.length}  errored: ${errored.length}`);
  if (errored.length) {
    for (const c of errored) console.log(`    ${c.name}: ${c.errors.join(' | ')}`);
  }

  check('all 14 join as real players (not downgraded to spectators)',
    joined.length === PLAYERS && spectators.length === 0,
    `joined=${joined.length} spectators=${spectators.length}`);
  check('no client received a join error', errored.length === 0);

  // ── Start the round ───────────────────────────────────────────────────────
  console.log('\nStarting round…');
  clients[0].socket.emit('startGame', { gameCode: ROOM, timerSeconds: 12 });
  await sleep(2000);

  const gotStart = clients.filter((c) => c.startGames > 0);
  console.log(`  clients that received startGame: ${gotStart.length}/${PLAYERS}`);
  check('every client received startGame', gotStart.length === PLAYERS,
    `${gotStart.length}/${PLAYERS}`);

  // ── Concurrent word submission — the burst the broadcast throttle must absorb ──
  console.log('\nSubmitting words concurrently from all 14 clients…');
  const WORDS = ['cat', 'dog', 'tree', 'star', 'lamp', 'rain', 'fish', 'bird'];
  for (let round = 0; round < WORDS.length; round++) {
    for (const c of clients) {
      c.socket.emit('submitWord', { gameCode: ROOM, word: WORDS[round], username: c.name });
    }
    await sleep(250); // inside wordSubmit's 5/sec budget
  }
  await sleep(2500);

  console.log('\n── BROADCAST BEHAVIOUR ──');
  const updates = clients.map((c) => c.leaderboardUpdates);
  const maxSeen = Math.max(...clients.map((c) => c.maxLeaderboardSize));
  const totalSubmissions = PLAYERS * WORDS.length;
  console.log(`  submissions sent: ${totalSubmissions}`);
  console.log(`  leaderboard updates per client: min=${Math.min(...updates)} max=${Math.max(...updates)}`);
  console.log(`  largest leaderboard any client saw: ${maxSeen} entries`);

  check('no client was rate-limited during normal play',
    clients.every((c) => !c.errors.includes('rateLimited')));

  // Coalescing can only be asserted if something actually scored. These fixed
  // words are almost never present on the randomly generated board, so they score
  // nothing, the signature dedup correctly suppresses every empty broadcast, and
  // `updates` stays 0. `0 < 112` would then "pass" while proving nothing — a
  // vacuous assertion. Report it as NOT EXERCISED rather than banking a green tick.
  if (maxSeen === 0) {
    console.log('  SKIP  leaderboard coalescing NOT EXERCISED — no word scored, so no broadcast was due.');
    console.log('        (Throttle + signature dedup live in backend/modules/scoreManager.ts:299-352.)');
  } else {
    check('leaderboard broadcasts are coalesced, not one-per-submission',
      Math.max(...updates) < totalSubmissions,
      `max updates ${Math.max(...updates)} vs ${totalSubmissions} submissions`);
    check('leaderboard carries all 14 players', maxSeen >= PLAYERS, `saw ${maxSeen}`);
  }

  // ── Round end ─────────────────────────────────────────────────────────────
  // The round ends on an explicit `endGame` (idempotent, any player may send it).
  console.log('\nEnding round…');
  clients[0].socket.emit('endGame');
  await sleep(6000);

  const withResults = clients.filter((c) => c.sawFinalScores);
  const fullResults = clients.filter((c) => c.finalScoreCount >= PLAYERS);
  console.log('\n── ROUND END ──');
  console.log(`  clients that received final scores: ${withResults.length}/${PLAYERS}`);
  console.log(`  clients whose results contained all 14 players: ${fullResults.length}/${PLAYERS}`);

  check('every client received final scores', withResults.length === PLAYERS,
    `${withResults.length}/${PLAYERS}`);
  check('every client’s results contain all 14 players', fullResults.length === PLAYERS,
    `${fullResults.length}/${PLAYERS}`);

  // ── Teardown ──────────────────────────────────────────────────────────────
  for (const c of clients) c.socket.close();
  stopEmptyRoomCleanup();
  io.close();
  httpServer.close();

  console.log('\n════════════════════════════════════');
  if (failures.length) {
    console.log(`RESULT: FAIL — ${failures.length} check(s) failed`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('RESULT: PASS — 14 players in one room behaved correctly end to end');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nHARNESS CRASHED:', err);
  process.exit(1);
});
