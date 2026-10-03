/**
 * P6 live-E2E driver: scripted teacher (authed) + scripted student (guest)
 * against the socket backend on :3001. Deterministic — no browser tab churn.
 *
 *   npx tsx scripts/p6-live-e2e.ts <LESSON_ID> <CLASSROOM_ID>
 *
 * Flow: createClassroomGame (wordcraft) → host createGame+join → student join
 * → host startGame {gameMode:'wordcraft'} → student wordcraft:init/place →
 * assert placeResult + leaderboard + activity. Prints the room code on line 1
 * of /tmp/p6-e2e-code.txt for the browser screenshot step.
 *
 * P6_KEEPALIVE=1 keeps the sockets connected for 6 minutes after PASS so
 * browser sessions can late-join the live room for screenshots.
 */
import '../server/loadEnv';
import fs from 'node:fs';
import { io, type Socket } from 'socket.io-client';

const [lessonId, classroomId] = process.argv.slice(2);
if (!lessonId || !classroomId) throw new Error('usage: p6-live-e2e.ts <LESSON_ID> <CLASSROOM_ID>');

const session = JSON.parse(fs.readFileSync('/tmp/p6-teacher-session.json', 'utf8'));
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

const host: Socket = io('http://localhost:3001', {
  transports: ['websocket'],
  auth: { token: session.access_token },
});
const student: Socket = io('http://localhost:3001', { transports: ['websocket'] });

let code = '';
let placed = false;
let accepted = false;
let passed = false;

function fail(msg: string): never {
  log('FAIL:', msg);
  process.exit(1);
}

host.on('connect', () => {
  log('host connected, creating classroom game');
  host.emit('createClassroomGame', {
    classroomId,
    teacherId: session.user.id,
    teacherName: 'P2 Critic',
    gameCode: Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''),
    lessonIds: [lessonId],
    lessonNames: ['Advanced Placement English Literature and Composition 2026 — words to re-learn (9/29/2026)'],
    vocabularyWords: ['anachronism', 'juxtapose'],
    settings: { gameMode: 'wordcraft', timerMinutes: parseInt(process.env.P6_TIMER_MIN || '3', 10), boardSize: 'medium', allowLateJoin: true },
  });
});

host.on('classroomGameCreated', (d: { gameCode?: string; code?: string }) => {
  code = d.gameCode || d.code || '';
  log('classroom game created:', code);
  if (!code) fail('no code in classroomGameCreated');
  fs.writeFileSync('/tmp/p6-e2e-code.txt', code);
  if (process.env.P6_PRESSURE) {
    const pressure = JSON.parse(process.env.P6_PRESSURE);
    log('applying pressure dials:', JSON.stringify(pressure));
    host.emit('updateClassroomGamePressure', { gameCode: code, pressure });
  }
  host.emit('createGame', { gameCode: code, playerName: 'P2 Critic', language: 'en' });
});

host.on('joined', (d: { isHost?: boolean }) => {
  log('host joined room, isHost=', d?.isHost);
  student.emit('join', { gameCode: code, username: 'P6 Script Student', language: 'en' });
});

student.on('joined', () => {
  const delayMs = parseInt(process.env.P6_DELAY_START_SEC || '0', 10) * 1000;
  log(`student joined — host starting wordcraft round in ${delayMs / 1000}s`);
  setTimeout(() => host.emit('startGame', {
    letterGrid: [],
    timerSeconds: parseInt(process.env.P6_TIMER_MIN || '3', 10) * 60,
    language: 'en',
    minWordLength: 2,
    difficulty: 'MEDIUM',
    gameMode: 'wordcraft',
    tvMode: true,
  }), delayMs);
});

student.on('startGame', (d: { gameMode?: string; pressure?: unknown }) => {
  log('student saw startGame mode=', d?.gameMode, 'pressure=', JSON.stringify(d?.pressure ?? null));
  if (d?.gameMode !== 'wordcraft') fail(`mode mismatch: ${d?.gameMode}`);
});

student.on('wordcraft:init', (d: { targets?: string[] }) => {
  log('wordcraft:init targets=', JSON.stringify(d?.targets));
  student.emit('wordcraft:requestState', { gameCode: code });
});

student.on('wordcraft:state', (d: { rack: Array<{ id: string; letter: string; value: number; isBlank?: boolean }>; targets: Array<string | { word: string }> }) => {
  const targetWords = (d.targets || []).map((t) => (typeof t === 'string' ? t : t.word));
  log('wordcraft:state rack=', d.rack.map((t) => t.letter).join(''), 'targets=', JSON.stringify(targetWords));
  if (placed || accepted || !targetWords.length) return;
  const word = targetWords[0].toLowerCase();
  const rack = [...d.rack];
  const placements: Array<{ rackTileId: string; row: number; col: number; letter: string; value: number; isBlank: boolean }> = [];
  for (let i = 0; i < word.length; i++) {
    const idx = rack.findIndex((t) => t.letter.toLowerCase() === word[i]);
    if (idx === -1) return log('rack cannot build', word, '— waiting for next state');
    const tile = rack.splice(idx, 1)[0];
    placements.push({ rackTileId: tile.id, row: 4, col: i, letter: tile.letter, value: tile.value, isBlank: !!tile.isBlank });
  }
  placed = true;
  log('placing', word);
  student.emit('wordcraft:place', { gameCode: code, placements, direction: 'horizontal' });
});

student.onAny((event: string) => {
  if (!['wordcraft:state', 'wordcraft:init', 'wordcraft:placeResult', 'startGame', 'joined'].includes(event)) {
    log('onAny:', event);
  }
});
student.on('wordcraft:placeResult', (d: { accepted?: boolean; error?: string; score?: number; moveScore?: number }) => {
  log('placeResult:', JSON.stringify(d));
  if (d?.accepted) accepted = true;
  if (!d?.accepted && !accepted) fail(`place rejected: ${d?.error}`);
});

student.on('updateLeaderboard', (d: { leaderboard?: Array<{ username: string; score: number }> }) => {
  const mine = d?.leaderboard?.find((p) => p.username === 'P6 Script Student');
  log('leaderboard:', JSON.stringify(d?.leaderboard));
  if (mine && mine.score > 0 && !passed) {
    passed = true;
    log('E2E PASS — wordcraft placed, score', mine.score);
    clearTimeout(watchdog);
    if (process.env.P6_SPECTATOR_PROBE) startSpectatorProbe();
    if (process.env.P6_KEEPALIVE) {
      log('KEEPALIVE: room stays live 6 min for screenshots — code', code);
      setTimeout(() => process.exit(0), 6 * 60 * 1000);
    } else {
      setTimeout(() => process.exit(0), 2000);
    }
  }
});

student.on('wordcraft:activity', (d: unknown) => log('activity:', JSON.stringify(d).slice(0, 160)));
host.on('error', (e: unknown) => log('HOST ERROR', JSON.stringify(e).slice(0, 250)));
student.on('error', (e: unknown) => log('STUDENT ERROR', JSON.stringify(e).slice(0, 250)));
host.on('classroomGameError', (e: unknown) => log('CLASSROOM ERR', JSON.stringify(e).slice(0, 250)));

/**
 * The projector-reload probe: a fresh spectator socket joins mid-race and
 * pulls wordcraft:projectorState — the checklist must come back with the
 * class's built flags intact, and the pull must never deal a personal board
 * (a wordcraft:state for the spectator would mean a seat was dealt).
 */
function startSpectatorProbe(): void {
  const spectator: Socket = io('http://localhost:3001', { transports: ['websocket'] });
  spectator.on('connect', () => spectator.emit('join', { gameCode: code, username: 'P6 Spectator', language: 'en' }));
  spectator.on('joined', () => {
    log('spectator joined — pulling projectorState (the reload)');
    spectator.emit('wordcraft:projectorState');
  });
  spectator.on('wordcraft:state', () => fail('spectator was dealt a personal board — projectorState dealt a seat'));
  spectator.on('wordcraft:projectorState', (d: { targets?: Array<{ word: string; built: boolean }> }) => {
    const targets = d?.targets ?? [];
    const juxtapose = targets.find((x) => x.word === 'JUXTAPOSE');
    log('SPECTATOR PROBE projectorState targets=', JSON.stringify(targets));
    if (!targets.length) fail('projectorState came back empty — the reload lost the checklist');
    if (!juxtapose?.built) fail('projectorState lost the built flag — the reload forgot the race');
    log('SPECTATOR PROBE PASS — checklist survives a mid-race reload, no seat dealt');
    spectator.disconnect();
  });
}

if (!process.env.P6_KEEPALIVE) setTimeout(() => fail('timeout (120s)'), 120000);
const watchdog = setTimeout(() => fail('keepalive expired without a placement (7min)'), 7 * 60 * 1000);
